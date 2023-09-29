import colors from "colors";
import { ANIME_PROVIDERS, BASE_PROVIDERS, MANGA_PROVIDERS, META_PROVIDERS } from "../../mappings";
import { Format, Type } from "../../types/enums";
import { ANIME_PROXIES, BASE_PROXIES, MANGA_PROXIES, META_PROXIES } from "..";

const toCheck: string[] = [];

export async function checkCorsProxies(): Promise<{
    base: string[];
    anime: string[];
    manga: string[];
    meta: string[];
}> {
    const baseIps: string[] = [];
    const animeIps: string[] = [];
    const mangaIps: string[] = [];
    const metaIps: string[] = [];
    console.log(colors.yellow("Importing proxies... Please note that reading the proxies file may take a while."));

    if (toCheck.length === 0) {
        const file = Bun.file("./proxies.json");
        if (await file.exists()) {
            // Check proxies.json
            const proxies = await file.json();
            for (let i = 0; i < proxies.length; i++) {
                const ip = proxies[i].ip;
                const port = proxies[i].port;

                const url = `http://${ip}:${port}`;
                toCheck.push(url);
            }
            console.log(colors.green(`Finished importing ${colors.yellow(toCheck.length + "")} current proxies.`));
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

    for (let i = 0; i < ips.length; i++) {
        const ip = ips[i];
        console.log(colors.green("Iteration ") + (i + 1) + colors.green(" of ") + ips.length + colors.green(".") + colors.gray(" (Timeout: 5 seconds)"));

        const promises = [];

        promises.push(
            new Promise(async (resolve, reject) => {
                const base = await makeRequest(ip, "BASE");
                if (base) baseIps.push(base) && console.log(colors.green(base.length + " passed!"));
                else console.log(colors.red(`${ip.ip}:${ip.port} failed.`));

                // Write to file
                Bun.write("./baseProxies.json", JSON.stringify(baseIps, null, 4));

                resolve(true);
            }),
        );

        promises.push(
            new Promise(async (resolve, reject) => {
                const anime = await makeRequest(ip, "ANIME");
                if (anime) animeIps.push(anime) && console.log(colors.green(anime.length + " passed!"));
                else console.log(colors.red(`${ip.ip}:${ip.port} failed.`));

                // Write to file
                Bun.write("./animeProxies.json", JSON.stringify(animeIps, null, 4));

                resolve(true);
            }),
        );

        promises.push(
            new Promise(async (resolve, reject) => {
                const manga = await makeRequest(ip, "MANGA");
                if (manga) mangaIps.push(manga) && console.log(colors.green(manga.length + " passed!"));
                else console.log(colors.red(`${ip.ip}:${ip.port} failed.`));

                // Write to file
                Bun.write("./mangaProxies.json", JSON.stringify(mangaIps, null, 4));

                resolve(true);
            }),
        );

        promises.push(
            new Promise(async (resolve, reject) => {
                const meta = await makeRequest(ip, "META");
                if (meta) metaIps.push(meta) && console.log(colors.green(meta.length + " passed!"));
                else console.log(colors.red(`${ip.ip}:${ip.port} failed.`));

                // Write to file
                Bun.write("./metaProxies.json", JSON.stringify(metaIps, null, 4));

                resolve(true);
            }),
        );

        console.log(colors.gray("Waiting for promises to resolve..."));
        await Promise.all(promises);

        console.log(colors.gray("Finished iteration ") + (i + 1) + colors.gray(" of ") + ips.length + colors.gray("."));
    }

    BASE_PROXIES.length = 0;
    ANIME_PROXIES.length = 0;
    MANGA_PROXIES.length = 0;
    META_PROXIES.length = 0;
    toCheck.length = 0;

    BASE_PROXIES.push(...baseIps);
    ANIME_PROXIES.push(...animeIps);
    MANGA_PROXIES.push(...mangaIps);
    META_PROXIES.push(...metaIps);

    console.log(colors.gray("Finished checking proxies."));
    return {
        base: baseIps,
        anime: animeIps,
        manga: mangaIps,
        meta: metaIps,
    };
}

async function makeRequest(ip: IP, type: "BASE" | "ANIME" | "MANGA" | "META"): Promise<string | undefined> {
    console.log(colors.yellow(colors.bold(`Testing ${type}.`)));
    return new Promise(async (resolve, reject) => {
        const controller = new AbortController();

        console.log(colors.gray("Checking ") + `${ip.ip}:${ip.port}` + colors.gray("."));

        setTimeout(() => {
            controller.abort();
        }, 5000);

        controller.signal.addEventListener("abort", () => {
            return resolve(undefined);
        });

        try {
            const response = await fetch(`http://${ip.ip}:${ip.port}/iscorsneeded`, {
                signal: controller.signal,
            }).catch(
                (err) =>
                    ({
                        ok: false,
                        status: 500,
                        statusText: "Timeout",
                        json: () => Promise.resolve({ error: err }),
                    }) as Response,
            );

            if (response.status === 200 && (await response.text()) === "no") {
                console.log(colors.green(`http://${ip.ip}:${ip.port} is a CORS proxy.`));

                // Check all providers
                let isOkay = true;
                if (type === "BASE") {
                    for (const provider of BASE_PROVIDERS) {
                        if (!provider.needsProxy || provider.useGoogleTranslate) continue;
                        console.log(colors.gray("Testing ") + provider.id + colors.gray("."));

                        provider.customProxy = `http://${ip.ip}:${ip.port}`;

                        const providerResponse = await provider.search("Mushoku Tensei", provider.formats.includes(Format.TV) ? Type.ANIME : Type.MANGA, provider.formats, 0, 10).catch(() => {
                            return undefined;
                        });

                        provider.customProxy = undefined;

                        if (!providerResponse) {
                            console.log(colors.red(`${provider.id} failed.`));
                            isOkay = false;
                            break;
                        }
                    }

                    if (isOkay) console.log(colors.yellow("Base providers passed."));
                    else return resolve(undefined);

                    return resolve(ip.ip + ":" + ip.port);
                }

                if (type === "ANIME") {
                    for (const provider of ANIME_PROVIDERS) {
                        if (!provider.needsProxy || provider.useGoogleTranslate) continue;
                        console.log(colors.gray("Testing ") + provider.id + colors.gray("."));

                        provider.customProxy = `http://${ip.ip}:${ip.port}`;

                        const providerResponse = await provider.search("Mushoku Tensei").catch(() => {
                            return undefined;
                        });

                        provider.customProxy = undefined;

                        if (!providerResponse) {
                            console.log(colors.red(`${provider.id} failed.`));
                            isOkay = false;
                            break;
                        }
                    }

                    if (isOkay) console.log(colors.yellow("Anime providers passed."));
                    else return resolve(undefined);

                    return resolve(ip.ip + ":" + ip.port);
                }

                if (type === "MANGA") {
                    for (const provider of MANGA_PROVIDERS) {
                        if (!provider.needsProxy || provider.useGoogleTranslate) continue;
                        console.log(colors.gray("Testing ") + provider.id + colors.gray("."));

                        provider.customProxy = `http://${ip.ip}:${ip.port}`;

                        const providerResponse = await provider.search("Mushoku Tensei").catch(() => {
                            return undefined;
                        });

                        provider.customProxy = undefined;

                        if (!providerResponse) {
                            console.log(colors.red(`${provider.id} failed.`));
                            isOkay = false;
                            break;
                        }
                    }

                    if (isOkay) console.log(colors.yellow("Manga providers passed."));
                    else return resolve(undefined);

                    return resolve(ip.ip + ":" + ip.port);
                }

                if (type === "META") {
                    for (const provider of META_PROVIDERS) {
                        if (!provider.needsProxy || provider.useGoogleTranslate) continue;
                        console.log(colors.gray("Testing ") + provider.id + colors.gray("."));

                        provider.customProxy = `http://${ip.ip}:${ip.port}`;

                        const providerResponse = await provider.search("Mushoku Tensei").catch(() => {
                            return undefined;
                        });

                        provider.customProxy = undefined;

                        if (!providerResponse) {
                            console.log(colors.red(`${provider.id} failed.`));
                            isOkay = false;
                            break;
                        }
                    }

                    if (isOkay) console.log(colors.yellow("Meta providers passed."));
                    else return resolve(undefined);

                    return resolve(ip.ip + ":" + ip.port);
                }
            } else {
                return resolve(undefined);
            }
        } catch (error) {
            return resolve(undefined);
        }
    });
}

interface IP {
    ip: string;
    port: number;
}
