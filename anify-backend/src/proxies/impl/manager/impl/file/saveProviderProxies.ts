import { proxyCache } from "../..";
import { ProviderType } from "../../../../../types";
import { saveJSON } from "../../../helper/saveJSON";
import type { IProxy } from "../../../../../types/impl/proxies";
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
                // If this is a new proxy, add it to our final list
                finalProxies[key] = {
                    ...proxy,
                    providerMetrics: {
                        [providerId]: {
                            healthScore: 50,
                            consecutiveFailures: 0,
                            successRate: 0,
                            averageResponseTime: 0,
                            successfulRequests: 0,
                            totalRequests: 0,
                            successStreak: 0,
                            latencyScore: 50,
                        },
                    },
                };

                // Add the current provider's metrics
                finalProxies[key].providerMetrics[providerId] = proxy.providerMetrics?.[providerId] || {
                    healthScore: 50,
                    consecutiveFailures: 0,
                    successRate: 0,
                    averageResponseTime: 0,
                    successfulRequests: 0,
                    totalRequests: 0,
                    successStreak: 0,
                    latencyScore: 50,
                };
            } else {
                // If this proxy already exists, just update the provider metrics
                finalProxies[key].providerMetrics[providerId] = proxy.providerMetrics?.[providerId] || {
                    healthScore: 50,
                    consecutiveFailures: 0,
                    successRate: 0,
                    averageResponseTime: 0,
                    successfulRequests: 0,
                    totalRequests: 0,
                    successStreak: 0,
                    latencyScore: 50,
                };
            }
        }
    }

    // Convert the map to an array and save
    const proxiesToSave = Object.values(finalProxies).filter((proxy) => {
        // Check if any provider for this proxy has valid metrics
        for (const providerId in proxyCache.validProxies[providerType]) {
            const metrics = proxy.providerMetrics[providerId];
            if (metrics && metrics.healthScore > 0 && metrics.consecutiveFailures < 3) {
                return true;
            }
        }
        return false;
    });

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
