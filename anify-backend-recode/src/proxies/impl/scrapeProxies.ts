import colors from "colors";
import { toCheck } from "..";
import { checkCorsProxies } from "./checkProxies";
import { env } from "../../env";

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

                await Bun.write("./proxies.json", JSON.stringify(hits, null, 4));
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
