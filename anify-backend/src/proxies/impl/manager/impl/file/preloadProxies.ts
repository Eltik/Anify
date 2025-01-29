import { proxyCache } from "../..";
import { PROVIDERS } from "../../../../../mappings";
import type { IProxy } from "../../../../../types/impl/proxies";
import { loadJSON } from "../../../helper/loadJSON";

export async function preloadProxies(): Promise<void> {
    if (proxyCache.proxies.length > 0) {
        return;
    }

    const proxies = await loadJSON<IProxy[]>("proxies.json");

    proxyCache.proxies = proxies;

    for (const prov of await PROVIDERS) {
        const provider = await prov;
        const fileName = `${provider.providerType}Proxies.json`;
        const typeProxies = await loadJSON<Record<string, IProxy[]>>(fileName);

        if (typeProxies[provider.id]) {
            proxyCache.validProxies[provider.providerType][provider.id] = typeProxies[provider.id];
        } else {
            proxyCache.validProxies[provider.providerType][provider.id] = [];
        }
    }
}
