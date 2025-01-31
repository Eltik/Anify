import { load } from "cheerio";
import type { IProxy } from "../../../../../../types/impl/proxies";

const scrape = async (): Promise<IProxy[]> => {
    const pages = 7;

    const promises = Array.from({ length: pages }, (_, i) => fetch(`https://list.proxylistplus.com/Fresh-HTTP-Proxy-List-${i + 1}`));
    const responses = await Promise.all(promises);

    const proxies: IProxy[] = [];

    for (const response of responses) {
        const html = await response.text();
        const $ = load(html);

        $("table")
            .eq(2)
            .find("tbody tr.cells")
            .each((_, element) => {
                const ip = $(element).find("td").eq(1).text();
                const port = $(element).find("td").eq(2).text();
                const anonymity = $(element).find("td").eq(3).text().trim();
                const country = $(element).find("td").eq(4).text();

                if (isNaN(Number(port))) {
                    return;
                }

                proxies.push({
                    ip,
                    port: Number(port),
                    country: country ?? "Unknown",
                    type: "HTTP",
                    anonymity,
                    providerMetrics: {},
                });
            });
    }

    return proxies;
};

export default scrape;
