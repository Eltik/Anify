import colors from "colors";
import { ANIME_PROXIES, BASE_PROXIES, MANGA_PROXIES, META_PROXIES } from "..";

export async function fetchCorsProxies(): Promise<{
    base: string[];
    anime: string[];
    manga: string[];
    meta: string[];
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
    const proxies: string[] = [];

    if (await base.exists()) {
        const BATCH_SIZE = 100;

        const proxyData = await base.json();
        const totalProxies = proxyData.length;
        let currentIndex = 0;

        while (currentIndex < totalProxies) {
            const proxiesToAdd: string[] = [];

            for (let i = 0; i < BATCH_SIZE && currentIndex < totalProxies; i++, currentIndex++) {
                const proxy = proxyData[currentIndex];

                if (!proxy.startsWith("http")) {
                    proxiesToAdd.push(`http://${proxy}`);
                } else {
                    proxiesToAdd.push(proxy);
                }
            }

            proxies.push(...proxiesToAdd);
        }

        console.log(colors.green("Finished importing ") + colors.yellow(totalProxies) + colors.green(" proxies from ") + colors.yellow(fileName) + colors.green("."));
    }

    return proxies;
}
