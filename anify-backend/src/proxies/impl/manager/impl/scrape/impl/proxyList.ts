import { load } from "cheerio";
import type { IProxy } from "../../../../../../types/impl/proxies";

const scrape = async (): Promise<IProxy[]> => {
    const pages = 10;

    const promises = Array.from({ length: pages }, (_, i) => fetch(`https://proxy-list.org/english/index.php?p=${i + 1}`));
    const responses = await Promise.all(promises);

    const proxies: IProxy[] = [];

    for (const response of responses) {
        const html = await response.text();
        const $ = load(html);

        $("div.proxy-table div.table ul").each((_, element) => {
            const proxyFunction = $(element).find("li.proxy script").text();
            const proxyString = proxyFunction.split("'")[1].split("'")[0];
            const proxy = Buffer.from(proxyString, "base64").toString("utf-8");

            const country = $(element).find("li.country-city span.country").attr("title");
            const type = $(element).find("li.https").text().trim();
            const anonymity = $(element).find("li.type").text().trim();

            proxies.push({
                ip: proxy.split(":")[0],
                port: Number(proxy.split(":")[1]),
                country: country ?? "Unknown",
                type,
                anonymity,
                providerMetrics: {
                    ANIME: {},
                    MANGA: {},
                    META: {},
                    INFORMATION: {},
                    BASE: {},
                },
            });
        });
    }

    return proxies;
};

export default scrape;
