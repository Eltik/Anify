import { proxyCache } from "../..";
import { PROVIDERS } from "../../../../../mappings";
import type { IProxy } from "../../../../../types/impl/proxies";
import { loadJSON } from "../../../helper/loadJSON";
import { env } from "../../../../../env";
import { emitter } from "../../../../../events";
import { Events } from "../../../../../types/impl/events";

// Helper function to convert date strings to Date objects in proxy metrics
const convertDates = (proxy: IProxy): IProxy => {
    Object.values(proxy.providerMetrics).forEach((providerMetrics) => {
        Object.values(providerMetrics).forEach((metrics) => {
            if (metrics.lastSuccessTime) {
                metrics.lastSuccessTime = new Date(metrics.lastSuccessTime);
            }
            if (metrics.lastFailureTime) {
                metrics.lastFailureTime = new Date(metrics.lastFailureTime);
            }
        });
    });
    return proxy;
};

export async function preloadProxies(): Promise<void> {
    if (proxyCache.proxies.length > 0) {
        return;
    }

    try {
        // Load the main proxy list
        const proxies = await loadJSON<IProxy[]>("proxies.json");
        proxyCache.proxies = proxies.map(convertDates);

        // Load provider-specific proxies and merge them into the main list
        for (const prov of await PROVIDERS) {
            const provider = await prov;
            const fileName = `${provider.providerType}Proxies.json`;

            try {
                const typeProxies = await loadJSON<IProxy[]>(fileName);

                // Initialize provider's proxy array
                if (!proxyCache.validProxies[provider.providerType][provider.id]) {
                    proxyCache.validProxies[provider.providerType][provider.id] = [];
                }

                // Update the main proxy list with any new proxies from provider file
                typeProxies.map(convertDates).forEach((typeProxy) => {
                    const existingProxy = proxyCache.proxies.find((p) => p.ip === typeProxy.ip && p.port === typeProxy.port);
                    if (existingProxy) {
                        // Merge metrics if proxy exists
                        existingProxy.providerMetrics = {
                            ...existingProxy.providerMetrics,
                            ...typeProxy.providerMetrics,
                        };
                    } else {
                        // Add new proxy to main list
                        proxyCache.proxies.push(typeProxy);
                    }
                });

                // Update validProxies cache with all proxies that have metrics for this provider
                proxyCache.validProxies[provider.providerType][provider.id] = proxyCache.proxies.filter((proxy) => proxy.providerMetrics?.[provider.id]);

                if (env.DEBUG) {
                    const totalCount = proxyCache.validProxies[provider.providerType][provider.id].length;
                    const healthyCount = proxyCache.validProxies[provider.providerType][provider.id].filter((proxy) => proxy.providerMetrics[provider.id].healthScore > 0).length;
                    console.log(`Loaded ${totalCount} proxies (${healthyCount} healthy) for ${provider.providerType} ${provider.id}`);
                }

                await emitter.emitAsync(Events.PROXIES_LOADED, proxyCache.validProxies[provider.providerType][provider.id].length, provider.providerType, provider.id);
            } catch {
                if (env.DEBUG) {
                    console.log(`No proxies found for ${provider.providerType} ${provider.id}`);
                }
                proxyCache.validProxies[provider.providerType][provider.id] = [];
                await emitter.emitAsync(Events.PROXIES_LOADED, 0, provider.providerType, provider.id);
            }
        }
    } catch {
        if (env.DEBUG) {
            console.log("Failed to load proxies.json, starting with empty proxy list");
        }
        proxyCache.proxies = [];
    }
}
