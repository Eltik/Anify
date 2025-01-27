import { proxyCache } from "../..";
import { ProviderType } from "../../../../../types";
import { saveJSON } from "../../../helper/saveJSON";
import type { IProxy } from "../../../../../types/impl/proxies";
import { env } from "../../../../../env";
import colors from "colors";

export async function saveProviderProxies(providerType: ProviderType): Promise<void> {
    const fileName = `${providerType}Proxies.json`;

    // Deduplicate proxies before saving
    for (const providerId in proxyCache.validProxies[providerType]) {
        const proxies = proxyCache.validProxies[providerType][providerId] || [];
        // Create a map of unique proxies using ip:port as key
        const uniqueProxiesMap = new Map<string, IProxy>();

        for (const proxy of proxies) {
            const key = `${proxy.ip}:${proxy.port}`;
            if (!uniqueProxiesMap.has(key)) {
                uniqueProxiesMap.set(key, proxy);
            }
        }

        proxyCache.validProxies[providerType][providerId] = Array.from(uniqueProxiesMap.values());
    }

    await saveJSON(fileName, proxyCache.validProxies[providerType]);
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
