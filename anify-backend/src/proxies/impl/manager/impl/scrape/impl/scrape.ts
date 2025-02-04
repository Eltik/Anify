import { CORS_HASH, MAX_REQUESTS } from "..";
import { env } from "../../../../../../env";
import type { IProxy } from "../../../../../../types/impl/proxies";
import { search, searchAPI } from "./search";
import colors from "colors";

const scrape = async (): Promise<IProxy[]> => {
    const hits: { ip: string; port: number }[] = [];
    let cursor: string | null = null;
    let currentRequest = 0;

    if (env.CENSYS_API_ID && env.CENSYS_API_SECRET) {
        try {
            do {
                const data = await searchAPI(CORS_HASH, cursor);
                if (!data || !data.result || !data.result.hits) {
                    break;
                }

                data.result.hits.filter((hit) => {
                    hit.services.some((service) => {
                        if (service.extended_service_name === "HTTP" || service.extended_service_name === "HTTPS") {
                            hits.push({ ip: hit.ip, port: service.port });
                        }
                    });
                });

                if (env.DEBUG) {
                    console.log(colors.gray("Fetched ") + colors.blue(hits.length + "") + colors.gray(" hits so far."));
                }

                cursor = data.result.links.next;
                currentRequest++;

                if (cursor === null || cursor === "" || currentRequest >= MAX_REQUESTS) {
                    if (env.DEBUG) {
                        console.log(colors.gray("Finished fetching proxies from Censys."));
                    }
                    break;
                }
            } while (cursor && cursor !== "" && currentRequest < MAX_REQUESTS);
        } catch (error) {
            console.error(error);
            return [];
        }

        return hits.map((hit) => {
            return {
                ip: hit.ip,
                port: hit.port,
                providerMetrics: {},
            } as IProxy;
        });
    } else {
        return (await search(CORS_HASH)) ?? [];
    }
};

export default scrape;
