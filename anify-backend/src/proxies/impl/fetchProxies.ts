import colors from "colors";
import { ANIME_PROXIES, BASE_PROXIES, MANGA_PROXIES, META_PROXIES } from "..";

export async function fetchCorsProxies(): Promise<{
    base: { providerId: string; ip: string }[];
    anime: { providerId: string; ip: string }[];
    manga: { providerId: string; ip: string }[];
    meta: { providerId: string; ip: string }[];
}> {
    const base = await loadProxies("./baseProxies.json");
    BASE_PROXIES.push(...base);

    const anime = await loadProxies("./animeProxies.json");
    ANIME_PROXIES.push(...anime);

    const manga = await loadProxies("./mangaProxies.json");
    MANGA_PROXIES.push(...manga);

    const meta = await loadProxies("./metaProxies.json");
    META_PROXIES.push(...meta);

    return {
        base: BASE_PROXIES,
        anime: ANIME_PROXIES,
        manga: BASE_PROXIES,
        meta: BASE_PROXIES,
    };
}

async function loadProxies(fileName: string) {
    const base = Bun.file(fileName);
    const proxies: { providerId: string; ip: string }[] = [];

    if (await base.exists()) {
        const BATCH_SIZE = 100;

        const proxyData = await base.json();
        const totalProxies = proxyData.length;
        let currentIndex = 0;

        while (currentIndex < totalProxies) {
            const proxiesToAdd: { providerId: string; ip: string }[] = [];

            for (let i = 0; i < BATCH_SIZE && currentIndex < totalProxies; i++, currentIndex++) {
                const proxy: { providerId: string; ip: string } = proxyData[currentIndex];

                if (!proxy.ip.startsWith("http")) {
                    proxiesToAdd.push({
                        providerId: proxy.providerId,
                        ip: `http://${proxy.ip}`,
                    });
                } else {
                    proxiesToAdd.push({
                        providerId: proxy.providerId,
                        ip: proxy.providerId,
                    });
                }
            }

            proxies.push(...proxiesToAdd);
        }

        console.log(colors.green("Finished importing ") + colors.yellow(totalProxies) + colors.green(" proxies from ") + colors.yellow(fileName) + colors.green("."));
    }

    return proxies;
}
