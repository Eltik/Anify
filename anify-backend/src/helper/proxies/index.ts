import colors from "colors";
import { existsSync, writeFileSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import ChunkedExecutor from "../executor";
import cluster from "node:cluster";
import { isString } from "..";
import { ANIME_PROVIDERS, MANGA_PROVIDERS, META_PROVIDERS } from "@/src/mapping";
import { env } from "process";

// List of CORS proxies
export const CORS_PROXIES: string[] = [];
const toCheck: string[] = [];

export async function fetchCorsProxies(): Promise<string[]> {
    if (existsSync(join(__dirname, "./goodProxies.json"))) {
        const BATCH_SIZE = 100;

        const fileContents = await readFile(join(__dirname, "./goodProxies.json"), "utf-8");
        const proxyData = JSON.parse(fileContents);
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

            if (cluster.isPrimary) console.log(colors.yellow(`Adding ${proxiesToAdd.length} proxies to the list.`));

            CORS_PROXIES.push(...proxiesToAdd);
        }

        if (cluster.isPrimary) console.log(colors.green("Finished importing proxies."));
    } else {
        return [];
    }
    return CORS_PROXIES;
}

export async function scrapeCorsProxies(): Promise<void> {
    const hits: { ip: string; port: number }[] = [];
    let cursor: any = null; // Initialize cursor as null
    const maxRequests = 50;
    let currentRequest = 0;

    console.log(colors.yellow("Searching for proxies on Censys..."));

    try {
        do {
            const data = await search("c7d96235df80ea051e9d57f3ab6d3e4da289fd3b", cursor);
            if (!data) {
                break;
            }

            data.result.hits.filter((hit) => {
                hit.services.some((service) => {
                    if (service.extended_service_name === "HTTP" || service.extended_service_name === "HTTPS") {
                        hits.push({ ip: hit.ip, port: service.port });
                    }
                });
            });

            console.log(colors.gray("Fetched ") + colors.blue(hits.length + "") + colors.gray(" hits so far."));

            cursor = data.result.links.next;
            currentRequest++;

            // Break the loop if cursor is null or empty string, or maxRequests limit is reached
            if (cursor === null || cursor === "" || currentRequest >= maxRequests) {
                console.log(colors.gray("Finished fetching proxies from Censys."));

                await writeFile(join(__dirname, "./proxies.json"), JSON.stringify(hits, null, 4));
                toCheck.push(...hits.map((hit) => `http://${hit.ip}:${hit.port}`));

                await checkCorsProxies();
                break;
            }
        } while (cursor !== null && cursor !== "" && currentRequest < maxRequests);
    } catch (error) {
        // Handle the error if necessary
        console.error(error);
    }
}

export async function checkCorsProxies(): Promise<string[]> {
    const goodIps: string[] = [];
    console.log(colors.yellow("Importing proxies... Please note that reading the proxies file may take a while."));
    if (toCheck.length === 0) {
        if (existsSync(join(__dirname, "./proxies.json"))) {
            // Check proxies.json
            const proxies = await readFile(join(__dirname, "./proxies.json"), "utf-8");
            if (proxies) {
                for (let i = 0; i < JSON.parse(proxies).length; i++) {
                    const ip = JSON.parse(proxies)[i].ip;
                    const port = JSON.parse(proxies)[i].port;

                    const url = `http://${ip}:${port}`;
                    toCheck.push(url);
                }
            }
            console.log(colors.green("Finished importing current proxies."));
        }
    }
    console.log(colors.yellow("Checking proxies..."));
    const ips = toCheck
        .map((proxy) => {
            try {
                const url = new URL(proxy);
                return { ip: url.hostname, port: Number(url.port) };
            } catch (e) {
                return { ip: "", port: 8080 };
            }
        })
        .filter((obj) => obj.port != 8080);

    const chunkSize = 25;
    const perChunkCallback = (chunk: IP[]) => {
        console.log(colors.gray(`Checking ${chunk.length} proxies...`));
    };

    const perResultsCallback = (result: (string | undefined)[]) => {
        const ips = result.filter(isString);
        goodIps.push(...ips);
        console.log(colors.green(`${ips.length} proxies are good!`));
        writeFileSync(join(__dirname, "./goodProxies.json"), JSON.stringify(goodIps, null, 4));
    };

    const executor = new ChunkedExecutor<IP, string | undefined>(ips, chunkSize, makeRequest, perChunkCallback, perResultsCallback);
    await executor.execute();

    console.log(colors.gray("Finished checking proxies."));

    CORS_PROXIES.length = 0;
    toCheck.length = 0;
    CORS_PROXIES.push(...goodIps);
    return goodIps;
}

async function search(q: string, cursor: string | null = null): Promise<Root | undefined> {
    const appendCursor = cursor ? `&cursor=${cursor}` : "";

    const url = "/hosts/search?q=" + q + `&per_page=100&virtual_hosts=EXCLUDE` + appendCursor;

    if (!env.CENSYS_ID || !env.CENSYS_SECRET) {
        console.log(colors.yellow("CENSYS_ID or CENSYS_SECRET not found in .env file. Please add them to scrape CORS proxies."));
        return undefined;
    }

    const apiID = env.CENSYS_ID ?? "d973cf60-4ce4-4746-962b-815ddfdebf80",
        apiSecret = env.CENSYS_SECRET ?? "s6EUuA4Sfaajd8jDBJ17b4DaoPofjDe6";

    const auth = "Basic " + Buffer.from(apiID + ":" + apiSecret).toString("base64");
    const headers = { Authorization: auth };

    const data = await (
        await fetch(`https://search.censys.io/api/v2${url}`, {
            headers: headers,
        })
    ).json();
    return data;
}

async function makeRequest(ip: IP): Promise<string | undefined> {
    const timeout = 3000;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeout);

    try {
        const response = await fetch(`http://${ip.ip}:${ip.port}/iscorsneeded`, {
            signal: controller.signal,
        });
        if (response.status === 200 && (await response.text()) === "no") {
            const secondResponse = await fetch(`http://${ip.ip}:${ip.port}/https://graphql.anilist.co`, {
                signal: controller.signal,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Origin: "graphql.anilist.co",
                },
                body: JSON.stringify({
                    query: `query ($id: Int) {
                        Media (id: $id) {
                            id
                            title {
                                romaji
                                english
                                native
                            }
                        }
                    }`,
                    variables: {
                        id: 21,
                    },
                }),
            }).catch((err) => {
                return null;
            });

            clearTimeout(id);
            if (secondResponse?.ok) {
                let text: any = undefined;

                try {
                    text = await secondResponse.json();
                } catch (e) {
                    console.log(colors.red(`Error parsing JSON from ${ip.ip}:${ip.port}: ${e}`));
                }

                if (!text) {
                    return undefined;
                }

                let isOkay = true;

                for (const provider of ANIME_PROVIDERS) {
                    console.log(colors.gray("Testing ") + provider.id + colors.gray("."));

                    provider.customProxy = `http://${ip.ip}:${ip.port}`;

                    const providerResponse = await provider.search("Mushoku Tensei").catch((err) => {
                        return undefined;
                    });

                    if (!providerResponse) {
                        console.log(colors.red(`${provider.id} failed.`));
                        isOkay = false;
                        provider.customProxy = undefined;
                        break;
                    }

                    provider.customProxy = undefined;
                }

                if (isOkay) {
                    console.log(colors.yellow("Anime providers passed."));
                } else {
                    console.log(colors.red("Anime providers failed."));
                    return undefined;
                }

                for (const provider of MANGA_PROVIDERS) {
                    console.log(colors.gray("Testing ") + provider.id + colors.gray("."));

                    provider.customProxy = `http://${ip.ip}:${ip.port}`;

                    const providerResponse = await provider.search("Mushoku Tensei").catch((err) => {
                        return undefined;
                    });

                    if (!providerResponse) {
                        isOkay = false;
                        provider.customProxy = undefined;
                        break;
                    }

                    provider.customProxy = undefined;
                }

                if (isOkay) {
                    console.log(colors.yellow("Manga providers passed."));
                } else {
                    console.log(colors.red("Manga providers failed."));
                    return undefined;
                }

                for (const provider of META_PROVIDERS) {
                    console.log(colors.gray("Testing ") + provider.id + colors.gray("."));

                    provider.customProxy = `http://${ip.ip}:${ip.port}`;

                    const providerResponse = await provider.search("Mushoku Tensei").catch((err) => {
                        return undefined;
                    });

                    if (!providerResponse) {
                        isOkay = false;
                        provider.customProxy = undefined;
                        break;
                    }

                    provider.customProxy = undefined;
                }

                if (isOkay) {
                    console.log(colors.yellow("Meta providers passed."));
                    return ip.ip + ":" + ip.port;
                } else {
                    console.log(colors.red("Meta providers failed."));
                    return undefined;
                }
            } else {
                return undefined;
            }
        } else {
            return undefined;
        }
    } catch (error) {
        return undefined;
    }
}

interface Root {
    code: number;
    status: string;
    result: Result;
}

interface Result {
    query: string;
    total: number;
    duration: number;
    hits: Hit[];
    links: Links;
}

interface Hit {
    ip: string;
    services: Service[];
    location: Location;
    autonomous_system: AutonomousSystem;
    last_updated_at: string;
    dns?: Dns;
}

interface Service {
    port: number;
    service_name: string;
    extended_service_name: string;
    transport_protocol: string;
    certificate?: string;
}

interface Location {
    continent: string;
    country: string;
    country_code: string;
    city: string;
    postal_code?: string;
    timezone: string;
    coordinates: Coordinates;
    province?: string;
}

interface Coordinates {
    latitude: number;
    longitude: number;
}

interface AutonomousSystem {
    asn: number;
    description: string;
    bgp_prefix: string;
    name: string;
    country_code: string;
}

interface Dns {
    reverse_dns: ReverseDns;
}

interface ReverseDns {
    names: string[];
}

interface Links {
    next: string;
    prev: string;
}

interface IP {
    ip: string;
    port: number;
}
