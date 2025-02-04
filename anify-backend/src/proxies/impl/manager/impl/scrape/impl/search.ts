import { load } from "cheerio";
import { env } from "../../../../../../env";
import type { ICensysRoot } from "../../../../../../types/impl/proxies/impl/scrape";
import colors from "colors";
import type { IProxy } from "../../../../../../types/impl/proxies";

export async function searchAPI(q: string, cursor: string | null = null): Promise<ICensysRoot | undefined> {
    const appendCursor = cursor ? `&cursor=${cursor}` : "";

    const url = "/hosts/search?q=" + q + `&per_page=100&virtual_hosts=EXCLUDE` + appendCursor;

    if (!env.CENSYS_API_ID || !env.CENSYS_API_SECRET) {
        if (env.DEBUG) {
            console.log(colors.yellow("CENSYS_ID or CENSYS_SECRET not found in .env file. Please add them to scrape CORS proxies."));
        }
        return undefined;
    }

    const apiID = env.CENSYS_API_ID ?? "d973cf60-4ce4-4746-962b-815ddfdebf80",
        apiSecret = env.CENSYS_API_SECRET ?? "s6EUuA4Sfaajd8jDBJ17b4DaoPofjDe6";

    const auth = "Basic " + Buffer.from(apiID + ":" + apiSecret).toString("base64");
    const headers = { Authorization: auth };

    const data = (await (
        await fetch(`https://search.censys.io/api/v2${url}`, {
            headers: headers,
        })
    ).json()) as ICensysRoot;
    return data;
}

export const search = async (q: string): Promise<IProxy[] | undefined> => {
    const data = await fetch(`https://search.censys.io/_search?resource=hosts&sort=RELEVANCE&per_page=100&virtual_hosts=EXCLUDE&q=${q}`);
    const $ = load(await data.text());

    const hits = $("div.result")
        .map((_, el) => {
            const ip = $(el).find("a strong").text();

            const metadata = $(el)
                .find("div.service")
                .map((_, el) => {
                    const port = $(el).find("a").text();
                    const extendedServiceName = port.split("/")[1];
                    return { port, extendedServiceName };
                })
                .get();

            return { ip, metadata };
        })
        .get();

    return hits.flatMap((hit) => {
        return hit.metadata.map((metadata) => {
            return {
                ip: hit.ip,
                port: parseInt(metadata.port),
                providerMetrics: {},
            } as IProxy;
        });
    });
};
