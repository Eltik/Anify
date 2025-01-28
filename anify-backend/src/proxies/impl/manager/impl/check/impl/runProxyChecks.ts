import { proxyCache } from "../../..";
import { env } from "../../../../../../env";
import { MediaProvider } from "../../../../../../types/impl/mappings/impl/mediaProvider";
import type { IProxy, IProxyChecksConfig } from "../../../../../../types/impl/proxies";
import colors from "colors";
import { saveProviderProxies } from "../../file/saveProviderProxies";
import pLimit from "p-limit";
import fs from "fs";
import path from "path";

/**
 * Small helper to throttle how often we update stdout with progress text
 */
let lastUpdateTime = 0;
const THROTTLE_INTERVAL = 100; // in milliseconds, adjust to be more or less aggressive
function throttledProgressUpdate(output: string) {
    const now = Date.now();
    if (now - lastUpdateTime > THROTTLE_INTERVAL) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
        process.stdout.write(output);
        lastUpdateTime = now;
    }
}

// Check if enough time has passed since last check (2.5 hours)
function shouldCheckProvider(lastChecked: string | undefined): boolean {
    if (!lastChecked) return true;

    const lastCheckTime = new Date(lastChecked).getTime();
    const currentTime = new Date().getTime();
    const hoursDiff = (currentTime - lastCheckTime) / (1000 * 60 * 60);

    return hoursDiff >= 2.5; // Check if 2.5 hours or more have passed
}

export const runProxyChecks = async (providers: MediaProvider[], verbose: boolean = false) => {
    const totalProxies = proxyCache.proxies.length;

    // Load config file
    const configPath = path.join(process.cwd(), "proxy-config.json");
    let config: IProxyChecksConfig = { proxyChecks: {} };
    try {
        config = JSON.parse(fs.readFileSync(configPath, "utf-8")) as IProxyChecksConfig;
    } catch {
        // If file doesn't exist or is invalid, we'll use default empty config
    }

    // Limit how many proxies are checked in parallel:
    // Increase/decrease as suits your environment:
    const concurrencyLimit = 50;
    const limit = pLimit(concurrencyLimit);

    for (const provider of providers) {
        if (!provider.needsProxy || provider.useGoogleTranslate) continue;

        // Get the provider's last check info
        const lastCheckInfo = config.proxyChecks[provider.providerType]?.[provider.id];

        // Skip if not enough time has passed since last check
        if (!shouldCheckProvider(lastCheckInfo?.lastChecked)) {
            if (env.DEBUG && verbose) {
                console.log(colors.yellow(`Skipping ${provider.providerType} ${provider.id} - last checked ${lastCheckInfo?.lastChecked}`));
            }
            continue;
        }

        provider.isCheckingProxies = true;

        let checkedCount = 0;
        let validCount = 0;
        let invalidCount = 0;

        if (env.DEBUG) {
            console.log(colors.yellow(`Checking proxies for ${provider.providerType} ${provider.id}...`));
        }

        // Reset the last updated time for each provider so the progress line is consistent:
        lastUpdateTime = 0;

        // Get the starting index from last check or start from beginning
        const startIndex = lastCheckInfo?.lastCheckedIndex ?? 0;

        // Get the slice of proxies to check, starting from where we left off
        const proxiesToCheck = proxyCache.proxies.slice(startIndex);

        // Check proxies in parallel with concurrency limiting:
        let checkResults: (IProxy | null)[] = [];
        try {
            checkResults = await Promise.all(
                proxiesToCheck.map((proxy) =>
                    limit(async () => {
                        const url = `http://${proxy.ip}:${proxy.port}`;
                        let isValid = false;

                        try {
                            isValid = (await provider.proxyCheck(url)) ?? false;
                        } catch (error) {
                            // Log the error but don't let it crash the script
                            if (env.DEBUG && verbose) {
                                console.error(`Error checking proxy ${url}: ${error instanceof Error ? error.message : String(error)}`);
                            }
                            isValid = false;
                        }

                        // Update progress counters
                        checkedCount += 1;
                        if (isValid) {
                            validCount += 1;
                        } else {
                            invalidCount += 1;
                        }

                        // Throttled progress update:
                        if (env.DEBUG && verbose) {
                            throttledProgressUpdate(colors.yellow(`Provider: ${provider.providerType} ${provider.id} | ` + `${checkedCount}/${proxiesToCheck.length} checked, ` + `${validCount} valid, ` + `${invalidCount} invalid`));
                        }

                        // Return the proxy if valid, otherwise null
                        return isValid ? proxy : null;
                    }).catch((error) => {
                        // Catch any errors that might occur in the limit wrapper
                        if (env.DEBUG && verbose) {
                            console.error(`Error in proxy check: ${error instanceof Error ? error.message : String(error)}`);
                        }
                        return null;
                    }),
                ),
            ).catch((error) => {
                // Catch any errors in Promise.all
                if (env.DEBUG && verbose) {
                    console.error(`Error in proxy batch check: ${error instanceof Error ? error.message : String(error)}`);
                }
                return [];
            });
        } catch (error) {
            if (env.DEBUG && verbose) {
                console.error(`Error in proxy batch check: ${error instanceof Error ? error.message : String(error)}`);
            }
            continue;
        }

        // After finishing all checks, print a new line to avoid overwriting
        if (env.DEBUG && verbose) {
            process.stdout.write("\n");
        }

        // Filter out null to get valid proxies
        const validProxies = checkResults.filter((p): p is IProxy => p !== null);

        // If we found valid proxies, save them and update config
        if (validProxies.length > 0) {
            proxyCache.validProxies[provider.providerType][provider.id] = validProxies;
            await saveProviderProxies(provider.providerType);

            // Update config with timestamp and last checked index
            if (!config.proxyChecks[provider.providerType]) {
                config.proxyChecks[provider.providerType] = {};
            }

            // If we've checked all proxies, reset the index to 0, otherwise save current position
            const newIndex = startIndex + proxiesToCheck.length >= totalProxies ? 0 : startIndex + proxiesToCheck.length;

            config.proxyChecks[provider.providerType]![provider.id] = {
                lastChecked: new Date().toISOString(),
                validProxiesFound: validProxies.length,
                lastCheckedIndex: newIndex,
            };

            // Save updated config
            fs.writeFileSync(configPath, JSON.stringify(config, null, 4));

            if (env.DEBUG) {
                console.log(colors.green(`Found ${validProxies.length} valid proxies for ${provider.providerType} ${provider.id}`));
            }
        } else {
            if (env.DEBUG) {
                console.log(colors.red(`No valid proxies found for ${provider.providerType} ${provider.id}`));
            }
        }

        provider.isCheckingProxies = false;
    }
};
