import colors from "colors";
import { CORS_PROXIES } from "..";

export async function fetchCorsProxies(): Promise<string[]> {
    const file = Bun.file("./goodProxies.json");
    if (file) {
        const BATCH_SIZE = 100;

        const proxyData = await file.json();
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

            console.log(colors.yellow(`Adding ${proxiesToAdd.length} proxies to the list.`));

            CORS_PROXIES.push(...proxiesToAdd);
        }

        console.log(colors.green("Finished importing proxies."));
    } else {
        return [];
    }
    return CORS_PROXIES;
}
