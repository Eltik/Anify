import { proxyCache } from "../..";
import { ProviderType } from "../../../../../types";
import { saveJSON } from "../../../helper/saveJSON";
import type { IProxy, IProxyProviderMetrics } from "../../../../../types/impl/proxies";
import { env } from "../../../../../env";
import colors from "colors";

export async function saveProviderProxies(providerType: ProviderType): Promise<void> {
    const fileName = `${providerType}Proxies.json`;

    // Create a map to store the final proxies with their metrics
    const finalProxies: Record<string, IProxy> = {};

    // Process all proxies for this provider type
    for (const providerId in proxyCache.validProxies[providerType]) {
        const proxies = proxyCache.validProxies[providerType][providerId] || [];

        for (const proxy of proxies) {
            const key = `${proxy.ip}:${proxy.port}`;

            if (!finalProxies[key]) {
                // Initialize empty provider metrics for all provider types
                const initialProviderMetrics = Object.values(ProviderType).reduce(
                    (acc, type) => {
                        acc[type] = {};
                        return acc;
                    },
                    {} as Record<ProviderType, Record<string, IProxyProviderMetrics>>,
                );

                // If this is a new proxy, add it to our final list
                finalProxies[key] = {
                    ...proxy,
                    providerMetrics: initialProviderMetrics,
                };

                // Add the current provider's metrics
                finalProxies[key].providerMetrics[providerType][providerId] = proxy.providerMetrics?.[providerType]?.[providerId] || {
                    healthScore: 50,
                    consecutiveFailures: 0,
                    successRate: 0,
                    averageResponseTime: 0,
                    successfulRequests: 0,
                    totalRequests: 0,
                };
            } else {
                // If this proxy already exists, just update the provider metrics
                finalProxies[key].providerMetrics[providerType][providerId] = proxy.providerMetrics?.[providerType]?.[providerId] || {
                    healthScore: 50,
                    consecutiveFailures: 0,
                    successRate: 0,
                    averageResponseTime: 0,
                    successfulRequests: 0,
                    totalRequests: 0,
                };
            }
        }
    }

    // Convert the map to an array and save
    const proxiesToSave = Object.values(finalProxies).filter((proxy) => Object.values(proxy.providerMetrics[providerType] || {}).some((metrics) => (metrics.healthScore || 0) > 0 && (metrics.consecutiveFailures || 0) < 3));

    if (env.DEBUG) {
        console.log(colors.green(`Saving ${proxiesToSave.length} proxies for ${providerType}`));
    }

    await saveJSON(fileName, proxiesToSave);
}

export async function removeProviderProxy(providerType: ProviderType, providerId: string, proxyUrl: string): Promise<void> {
    const proxies = proxyCache.validProxies[providerType][providerId] || [];
    const [ip, port] = proxyUrl.replace("http://", "").split(":");

    // Remove the proxy from the cache
    proxyCache.validProxies[providerType][providerId] = proxies.filter((proxy) => !(proxy.ip === ip && proxy.port === Number(port)));

    // Save the updated proxy list
    await saveProviderProxies(providerType);

    if (env.DEBUG) {
        console.log(colors.red(`Removed proxy ${proxyUrl} from ${providerType} ${providerId}`));
    }
}
