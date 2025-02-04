import { MediaProvider } from "../../../../../types/impl/mappings/impl/mediaProvider";
import colors from "colors";
import { runProxyChecks } from "./impl/runProxyChecks";
import { saveProxies } from "../file/saveProxies";
import { loadJSON } from "../../../helper/loadJSON";
import { ProviderType } from "../../../../../types";
import type { IProxy } from "../../../../../types/impl/proxies";
import { env } from "../../../../../env";
import { preloadProxies } from "../file/preloadProxies";

export const checkProxies = async (providers: MediaProvider[], verbose: boolean = false) => {
    // Load existing proxies from proxies.json
    let existingProxies: IProxy[] = [];
    try {
        existingProxies = await loadJSON<IProxy[]>("proxies.json");
        if (env.DEBUG && verbose) {
            console.log(colors.green(`Loaded ${existingProxies.length} existing proxies from proxies.json`));
        }
    } catch {
        // If file doesn't exist or is invalid, continue with empty array
        if (env.DEBUG && verbose) {
            console.log(colors.yellow("No existing proxies found in proxies.json"));
        }
    }

    // Load and consolidate existing provider-specific proxies
    const providerTypes = Object.values(ProviderType);
    const allProviderProxies: IProxy[] = [];

    for (const providerType of providerTypes) {
        try {
            const fileName = `${providerType}Proxies.json`;
            const typeProxies = await loadJSON<IProxy[]>(fileName);
            allProviderProxies.push(...typeProxies);
        } catch {
            // Skip if file doesn't exist or is invalid
            continue;
        }
    }

    // Merge existing proxies with provider-specific proxies, preserving metrics
    for (const providerProxy of allProviderProxies) {
        const existingProxy = existingProxies.find((p) => p.ip === providerProxy.ip && p.port === providerProxy.port);
        if (existingProxy) {
            // Merge provider metrics
            Object.entries(providerProxy.providerMetrics).forEach(([providerId, metrics]) => {
                existingProxy.providerMetrics[providerId] = {
                    ...existingProxy.providerMetrics[providerId],
                    ...metrics,
                };
            });
        } else {
            existingProxies.push(providerProxy);
        }
    }

    // Save consolidated proxies
    if (existingProxies.length > 0) {
        await saveProxies(existingProxies);
        if (env.DEBUG && verbose) {
            console.log(colors.green(`Saved ${existingProxies.length} consolidated proxies to proxies.json`));
        }
    }

    // Preload the proxies into cache before running checks
    await preloadProxies();

    if (env.DEBUG && verbose) {
        console.log(colors.green(`Checking ${providers.filter((p) => p.needsProxy).length} providers for proxy support.`));
    }

    await runProxyChecks(providers, verbose);
};
