import { PROVIDERS } from "../mappings";
import { MediaFormat, MediaType, ProviderType } from "../types";
import { preloadProxies } from "../proxies/impl/manager/impl/file/preloadProxies";
import { proxyCache, updateProxyHealth } from "../proxies/impl/manager";
import { env } from "../env";
import colors from "colors";
import pLimit from "p-limit";
import type { MediaProvider } from "../types/impl/mappings/impl/mediaProvider";

interface TrainingConfig {
    concurrentTests: number;
    testsPerProvider: number;
    minHealthThreshold: number;
    maxTrainingTime: number; // in minutes
    providerTypes: ProviderType[];
}

interface TestCase {
    title: string;
    id: string;
}

const DEFAULT_CONFIG: TrainingConfig = {
    concurrentTests: 25,
    testsPerProvider: 50,
    minHealthThreshold: 30,
    maxTrainingTime: 60, // 1 hour
    providerTypes: [ProviderType.ANIME, ProviderType.MANGA, ProviderType.META, ProviderType.INFORMATION],
};

// Test cases for different provider types
const TEST_CASES: Record<ProviderType, TestCase[]> = {
    [ProviderType.ANIME]: [
        { title: "Mushoku Tensei", id: "108465" },
        { title: "One Piece", id: "21" },
        { title: "Attack on Titan", id: "16498" },
    ],
    [ProviderType.MANGA]: [
        { title: "Mushoku Tensei", id: "bd6d0982-0091-4945-ad70-c028ed3c0917" },
        { title: "One Piece", id: "manga-123" },
        { title: "Solo Leveling", id: "manga-456" },
    ],
    [ProviderType.META]: [
        { title: "Mushoku Tensei", id: "108465" },
        { title: "One Piece", id: "21" },
        { title: "Attack on Titan", id: "16498" },
    ],
    [ProviderType.INFORMATION]: [
        { title: "Mushoku Tensei", id: "108465" },
        { title: "One Piece", id: "21" },
        { title: "Attack on Titan", id: "16498" },
    ],
    [ProviderType.BASE]: [], // Empty array for BASE type
};

async function testProvider(provider: MediaProvider, proxy: string, testCase: TestCase): Promise<{ success: boolean; responseTime?: number }> {
    const startTime = Date.now();
    try {
        if ("search" in provider && typeof provider.search === "function") {
            await provider.search(testCase.title, proxy);
        } else if ("info" in provider && typeof provider.info === "function") {
            await provider.info(
                {
                    id: testCase.id,
                    type: provider.providerType === ProviderType.MANGA ? MediaType.MANGA : MediaType.ANIME,
                    formats: [provider.providerType === ProviderType.MANGA ? MediaFormat.MANGA : MediaFormat.TV],
                    mappings: [
                        {
                            id: testCase.id,
                            providerId: provider.id,
                            providerType: provider.providerType,
                            similarity: 1,
                        },
                    ],
                },
                proxy,
            );
        }
        return { success: true, responseTime: Date.now() - startTime };
    } catch {
        return { success: false, responseTime: Date.now() - startTime };
    }
}

async function trainProvider(provider: MediaProvider, config: TrainingConfig) {
    if (!provider.needsProxy || provider.useGoogleTranslate) {
        return;
    }

    const testCases = TEST_CASES[provider.providerType] || [];
    if (testCases.length === 0) {
        console.log(colors.yellow(`No test cases for provider type ${provider.providerType}`));
        return;
    }

    const limit = pLimit(config.concurrentTests);
    const proxies = proxyCache.validProxies[provider.providerType][provider.id] || [];

    if (proxies.length === 0) {
        console.log(colors.red(`No proxies available for ${provider.providerType} ${provider.id}`));
        return;
    }

    console.log(colors.cyan(`Training proxies for ${provider.providerType} ${provider.id}...`));
    console.log(colors.gray(`Initial proxy count: ${proxies.length}`));

    const trainingPromises: Promise<void>[] = [];

    for (let i = 0; i < config.testsPerProvider; i++) {
        const testCase = testCases[i % testCases.length];

        for (const proxy of proxies) {
            trainingPromises.push(
                limit(async () => {
                    const proxyUrl = `http://${proxy.ip}:${proxy.port}`;
                    const result = await testProvider(provider, proxyUrl, testCase);

                    updateProxyHealth(proxy, result.success, provider.providerType, provider.id, result.responseTime);

                    if (env.DEBUG) {
                        const metrics = proxy.providerMetrics[provider.providerType][provider.id];
                        process.stdout.write(`\rProxy ${proxy.ip}:${proxy.port} - Health: ${metrics.healthScore.toFixed(2)} - Success Rate: ${((metrics.successfulRequests / metrics.totalRequests) * 100).toFixed(2)}%`);
                    }
                }),
            );
        }
    }

    try {
        const results = await Promise.allSettled(trainingPromises);
        const failedTests = results.filter((r) => r.status === "rejected").length;
        if (failedTests > 0) {
            console.error(colors.yellow(`${failedTests} tests failed for ${provider.providerType} ${provider.id}`));
        }
    } catch {
        console.error(colors.red(`Fatal error during training for ${provider.providerType} ${provider.id}`));
    }

    // Filter out unhealthy proxies
    const healthyProxies = proxies.filter((proxy) => proxy.providerMetrics[provider.providerType][provider.id].healthScore >= config.minHealthThreshold);

    console.log(colors.green(`\nTraining complete for ${provider.providerType} ${provider.id}`));
    console.log(colors.gray(`Healthy proxies: ${healthyProxies.length}/${proxies.length}`));
}

export async function trainProxies(customConfig: Partial<TrainingConfig> = {}) {
    const config = { ...DEFAULT_CONFIG, ...customConfig };
    const startTime = Date.now();

    console.log(colors.cyan("Starting proxy training..."));
    await preloadProxies();

    const providers = await PROVIDERS;
    for (const provider of providers) {
        if (config.providerTypes.includes(provider.providerType)) {
            if (Date.now() - startTime > config.maxTrainingTime * 60 * 1000) {
                console.log(colors.yellow("Maximum training time reached, stopping..."));
                break;
            }
            await trainProvider(provider, config);
        }
    }

    console.log(colors.green("\nProxy training complete!"));
    console.log(colors.gray(`Total time: ${((Date.now() - startTime) / 1000 / 60).toFixed(2)} minutes`));
}

function printUsage() {
    console.log(colors.cyan("\nProxy Trainer Usage:"));
    console.log(colors.gray("bun run src/scripts/proxyTrainer.ts [options]"));
    console.log("\nOptions:");
    console.log("  --help                 Show this help message");
    console.log("  --types=<types>        Comma-separated list of provider types to train");
    console.log("                         Valid types: ANIME,MANGA,META,INFORMATION,BASE");
    console.log("  --concurrent=<number>   Number of concurrent tests (default: 25)");
    console.log("  --tests=<number>       Number of tests per provider (default: 50)");
    console.log("  --threshold=<number>   Minimum health threshold (default: 30)");
    console.log("  --time=<minutes>       Maximum training time in minutes (default: 60)");
    console.log("\nExamples:");
    console.log("  bun run src/scripts/proxyTrainer.ts --types=ANIME,MANGA");
    console.log("  bun run src/scripts/proxyTrainer.ts --types=META --concurrent=50 --time=120");
}

// Parse command line arguments
function parseArgs(): Partial<TrainingConfig> {
    const args = process.argv.slice(2);
    const config: Partial<TrainingConfig> = {};

    for (const arg of args) {
        if (arg === "--help") {
            printUsage();
            process.exit(0);
        }

        const [key, value] = arg.split("=");
        if (!value) continue;

        switch (key) {
            case "--types": {
                const types = value.split(",").map((t) => t.trim().toUpperCase());
                const validTypes = Object.values(ProviderType);
                const invalidTypes = types.filter((t) => !validTypes.includes(t as ProviderType));

                if (invalidTypes.length > 0) {
                    console.error(colors.red(`Invalid provider types: ${invalidTypes.join(", ")}`));
                    console.error(colors.yellow(`Valid types are: ${validTypes.join(", ")}`));
                    process.exit(1);
                }

                config.providerTypes = types as ProviderType[];
                break;
            }
            case "--concurrent":
                const concurrent = parseInt(value);
                if (isNaN(concurrent) || concurrent < 1) {
                    console.error(colors.red("Invalid concurrent tests value. Must be a positive number."));
                    process.exit(1);
                }
                config.concurrentTests = concurrent;
                break;
            case "--tests":
                const tests = parseInt(value);
                if (isNaN(tests) || tests < 1) {
                    console.error(colors.red("Invalid tests per provider value. Must be a positive number."));
                    process.exit(1);
                }
                config.testsPerProvider = tests;
                break;
            case "--threshold":
                const threshold = parseInt(value);
                if (isNaN(threshold) || threshold < 0 || threshold > 100) {
                    console.error(colors.red("Invalid health threshold value. Must be between 0 and 100."));
                    process.exit(1);
                }
                config.minHealthThreshold = threshold;
                break;
            case "--time":
                const time = parseInt(value);
                if (isNaN(time) || time < 1) {
                    console.error(colors.red("Invalid maximum training time. Must be a positive number of minutes."));
                    process.exit(1);
                }
                config.maxTrainingTime = time;
                break;
        }
    }

    return config;
}

// Allow running directly from command line
if (require.main === module) {
    if (process.argv.length <= 2) {
        printUsage();
        process.exit(0);
    }

    const config = parseArgs();
    trainProxies(config).catch(console.error);
}
