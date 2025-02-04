import { proxyCache } from "../..";
import { PROVIDERS } from "../../../../../mappings";
import type { IProxy } from "../../../../../types/impl/proxies";
import { loadJSON } from "../../../helper/loadJSON";
import { emitter } from "../../../../../events";
import { Events } from "../../../../../types/impl/events";
import colors from "colors";

// Helper function to convert date strings to Date objects in proxy metrics
const convertDates = (proxy: IProxy): IProxy => {
    if (!proxy.providerMetrics) {
        proxy.providerMetrics = {};
        return proxy;
    }

    Object.entries(proxy.providerMetrics).forEach(([providerId, providerMetrics]) => {
        if (!providerMetrics) {
            proxy.providerMetrics[providerId] = {
                healthScore: 50,
                consecutiveFailures: 0,
                successRate: 0,
                averageResponseTime: 0,
                successfulRequests: 0,
                totalRequests: 0,
                successStreak: 0,
                latencyScore: 50,
            };
            return;
        }

        // Convert timestamps to numbers if they're strings
        if (providerMetrics.lastSuccessTime) {
            providerMetrics.lastSuccessTime = typeof providerMetrics.lastSuccessTime === "string" ? new Date(providerMetrics.lastSuccessTime).getTime() : providerMetrics.lastSuccessTime;
        }
        if (providerMetrics.lastFailureTime) {
            providerMetrics.lastFailureTime = typeof providerMetrics.lastFailureTime === "string" ? new Date(providerMetrics.lastFailureTime).getTime() : providerMetrics.lastFailureTime;
        }
    });
    return proxy;
};

export async function preloadProxies(): Promise<void> {
    try {
        // Load the main proxy list
        const proxies = await loadJSON<IProxy[]>("proxies.json");
        if (!Array.isArray(proxies)) {
            console.error(colors.red("[Proxy Manager] Main proxies.json is not an array"));
            return;
        }
        proxyCache.proxies = proxies.map(convertDates);
        console.log(colors.green(`[Proxy Manager] Loaded ${proxyCache.proxies.length} main proxies`));

        // Load provider-specific proxies and merge them into the main list
        for (const prov of await PROVIDERS) {
            const provider = await prov;
            const fileName = `${provider.providerType}Proxies.json`;

            try {
                const typeProxies = await loadJSON<IProxy[]>(fileName);
                if (!Array.isArray(typeProxies)) {
                    console.error(colors.red(`[Proxy Manager] ${fileName} is not an array`));
                    continue;
                }

                // Ensure the provider type and ID are initialized
                if (!proxyCache.validProxies[provider.providerType]) {
                    proxyCache.validProxies[provider.providerType] = {};
                }
                if (!proxyCache.validProxies[provider.providerType][provider.id]) {
                    proxyCache.validProxies[provider.providerType][provider.id] = [];
                }

                // Only include proxies that have metrics for this specific provider
                const convertedProxies = typeProxies.map(convertDates).filter((proxy) => proxy.providerMetrics && proxy.providerMetrics[provider.id]);

                // Update the provider's proxy list
                proxyCache.validProxies[provider.providerType][provider.id] = convertedProxies;

                // Update the main proxy list with any new proxies that have metrics for this provider
                convertedProxies.forEach((typeProxy) => {
                    const existingProxy = proxyCache.proxies.find((p) => p.ip === typeProxy.ip && p.port === typeProxy.port);
                    if (existingProxy) {
                        existingProxy.providerMetrics = {
                            ...existingProxy.providerMetrics,
                            [provider.id]: typeProxy.providerMetrics[provider.id],
                        };
                    } else {
                        // Only include the metrics for this specific provider but preserve all other properties
                        const newProxy = {
                            ...typeProxy,
                            providerMetrics: {
                                [provider.id]: typeProxy.providerMetrics[provider.id],
                            },
                        };
                        proxyCache.proxies.push(newProxy);
                    }
                });
            } catch (error) {
                console.error(colors.red(`[Proxy Manager] Error loading ${fileName}:`), error);
                // Initialize empty array for this provider if file loading fails
                if (!proxyCache.validProxies[provider.providerType]) {
                    proxyCache.validProxies[provider.providerType] = {};
                }
                proxyCache.validProxies[provider.providerType][provider.id] = [];
            }
        }

        emitter.emit(Events.PROXIES_LOADED, proxyCache.proxies);
    } catch (error) {
        console.error(colors.red("[Proxy Manager] Error in preloadProxies:"), error);
        throw error;
    }
}
