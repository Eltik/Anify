import colors from "colors";
import { isString } from "../../helper";
import ChunkedExecutor from "../executor";
import { CORS_PROXIES } from "..";
import { ANIME_PROVIDERS, MANGA_PROVIDERS, META_PROVIDERS } from "../../mappings";

const toCheck: string[] = [];

export async function checkCorsProxies(): Promise<string[]> {
    const goodIps: string[] = [];
    console.log(colors.yellow("Importing proxies... Please note that reading the proxies file may take a while."));
    if (toCheck.length === 0) {
        const file = Bun.file("./proxies.json");
        if (file) {
            // Check proxies.json
            const proxies = await file.json();
            for (let i = 0; i < proxies.length; i++) {
                const ip = proxies[i].ip;
                const port = proxies[i].port;

                const url = `http://${ip}:${port}`;
                toCheck.push(url);
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

        Bun.write("./goodProxies.json", JSON.stringify(goodIps, null, 4));
    };

    const executor = new ChunkedExecutor<IP, string | undefined>(ips, chunkSize, makeRequest, perChunkCallback, perResultsCallback);
    await executor.execute();

    console.log(colors.gray("Finished checking proxies."));

    CORS_PROXIES.length = 0;
    toCheck.length = 0;
    CORS_PROXIES.push(...goodIps);
    return goodIps;
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

                    const providerResponse = await provider.search("Mushoku Tensei").catch(() => {
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

                    const providerResponse = await provider.search("Mushoku Tensei").catch(() => {
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

                    const providerResponse = await provider.search("Mushoku Tensei").catch(() => {
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

interface IP {
    ip: string;
    port: number;
}
