import colors from "colors";
import { ANIME_PROVIDERS, BASE_PROVIDERS, MANGA_PROVIDERS, META_PROVIDERS } from "../../mappings";
import { Format, ProviderType, Type } from "../../types/enums";
import { ANIME_PROXIES, BASE_PROXIES, MANGA_PROXIES, META_PROXIES } from "..";
import AnimeProvider from "../../mappings/impl/anime";
import MangaProvider from "../../mappings/impl/manga";
import MetaProvider from "../../mappings/impl/meta";
import BaseProvider from "../../mappings/impl/base";

const toCheck: string[] = [];

export async function checkCorsProxies(
    importProxies: boolean = false,
    startIndex: number = 0,
): Promise<{
    base: { providerId: string; ip: string }[];
    anime: { providerId: string; ip: string }[];
    manga: { providerId: string; ip: string }[];
    meta: { providerId: string; ip: string }[];
}> {
    const baseIps: { providerId: string; ip: string }[] = [];
    const animeIps: { providerId: string; ip: string }[] = [];
    const mangaIps: { providerId: string; ip: string }[] = [];
    const metaIps: { providerId: string; ip: string }[] = [];
    console.log(colors.yellow("Importing proxies... Please note that reading the proxies file may take a while."));

    if (importProxies) {
        console.log(colors.yellow("WARNING: Importing current proxies."));

        const baseProxies = Bun.file("./baseProxies.json");
        if (await baseProxies.exists()) {
            // Check proxies.json
            const proxies = await baseProxies.json();
            for (let i = 0; i < proxies.length; i++) {
                baseIps.push({ providerId: proxies[i].providerId, ip: proxies[i].ip });
            }
            console.log(colors.green(`Finished importing ${colors.yellow(proxies.length + "")} base proxies.`));
        }

        const animeProxies = Bun.file("./animeProxies.json");
        if (await animeProxies.exists()) {
            // Check proxies.json
            const proxies = await animeProxies.json();
            for (let i = 0; i < proxies.length; i++) {
                animeIps.push({ providerId: proxies[i].providerId, ip: proxies[i].ip });
            }
            console.log(colors.green(`Finished importing ${colors.yellow(proxies.length + "")} anime proxies.`));
        }

        const mangaProxies = Bun.file("./mangaProxies.json");
        if (await mangaProxies.exists()) {
            // Check proxies.json
            const proxies = await mangaProxies.json();
            for (let i = 0; i < proxies.length; i++) {
                mangaIps.push({ providerId: proxies[i].providerId, ip: proxies[i].ip });
            }
            console.log(colors.green(`Finished importing ${colors.yellow(proxies.length + "")} manga proxies.`));
        }

        const metaProxies = Bun.file("./metaProxies.json");
        if (await metaProxies.exists()) {
            // Check proxies.json
            const proxies = await metaProxies.json();
            for (let i = 0; i < proxies.length; i++) {
                metaIps.push({ providerId: proxies[i].providerId, ip: proxies[i].ip });
            }
            console.log(colors.green(`Finished importing ${colors.yellow(proxies.length + "")} meta proxies.`));
        }

        console.log("=========================================");
    }

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
            console.log(colors.green(`Finished importing ${colors.yellow(toCheck.length + "")} proxies from the proxies list file.`));
        }
    }

    console.log(colors.yellow("Checking proxies..."));
    const ips = toCheck
        .map((proxy) => {
            try {
                const url = new URL(proxy);

                // Check if it exists
                if (baseIps.find((obj) => obj.ip === `${url.hostname}:${url.port}`)) return { ip: "", port: 8080 };
                if (animeIps.find((obj) => obj.ip === `${url.hostname}:${url.port}`)) return { ip: "", port: 8080 };
                if (mangaIps.find((obj) => obj.ip === `${url.hostname}:${url.port}`)) return { ip: "", port: 8080 };
                if (metaIps.find((obj) => obj.ip === `${url.hostname}:${url.port}`)) return { ip: "", port: 8080 };

                return { ip: url.hostname, port: Number(url.port) };
            } catch (e) {
                return { ip: "", port: 8080 };
            }
        })
        .filter((obj) => obj.port != 8080);

    for (let i = startIndex; i < ips.length; i++) {
        const ip = ips[i];
        console.log(colors.green("Iteration ") + (i + 1) + colors.green(" of ") + ips.length + colors.green(".") + colors.gray(" (Timeout: 5 seconds)"));

        const promises = [];

        promises.push(
            new Promise(async (resolve) => {
                const base = await makeRequest(ip, "BASE");
                if (base) {
                    for (const provider of base) {
                        baseIps.push({ providerId: provider, ip: `${ip.ip}:${ip.port}` });
                    }
                }

                // Write to file
                Bun.write("./baseProxies.json", JSON.stringify(baseIps, null, 4));

                resolve(true);
            }),
        );

        promises.push(
            new Promise(async (resolve) => {
                const anime = await makeRequest(ip, "ANIME");
                if (anime) {
                    for (const provider of anime) {
                        animeIps.push({ providerId: provider, ip: `${ip.ip}:${ip.port}` });
                    }
                    console.log(colors.green(anime.length + " anime proxies passed!"));
                }

                // Write to file
                Bun.write("./animeProxies.json", JSON.stringify(animeIps, null, 4));

                resolve(true);
            }),
        );

        promises.push(
            new Promise(async (resolve) => {
                const manga = await makeRequest(ip, "MANGA");
                if (manga) {
                    for (const provider of manga) {
                        mangaIps.push({ providerId: provider, ip: `${ip.ip}:${ip.port}` });
                    }
                    console.log(colors.green(manga.length + " manga proxies passed!"));
                }

                // Write to file
                Bun.write("./mangaProxies.json", JSON.stringify(mangaIps, null, 4));

                resolve(true);
            }),
        );

        promises.push(
            new Promise(async (resolve) => {
                const meta = await makeRequest(ip, "META");
                if (meta) {
                    for (const provider of meta) {
                        metaIps.push({ providerId: provider, ip: `${ip.ip}:${ip.port}` });
                    }
                    console.log(colors.green(meta.length + " meta proxies passed!"));
                }

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

async function makeRequest(ip: IP, type: "BASE" | "ANIME" | "MANGA" | "META"): Promise<string[] | undefined> {
    console.log(colors.yellow(colors.bold(`Testing ${type}.`)));
    return new Promise(async (resolve) => {
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
                const validProviders = [];

                if (type === "BASE") {
                    for (const provider of BASE_PROVIDERS) {
                        if ((provider.needsProxy && !provider.useGoogleTranslate) || provider.overrideProxy) validProviders.push(provider);
                    }
                } else if (type === "ANIME") {
                    for (const provider of ANIME_PROVIDERS) {
                        if ((provider.needsProxy && !provider.useGoogleTranslate) || provider.overrideProxy) validProviders.push(provider);
                    }
                } else if (type === "MANGA") {
                    for (const provider of MANGA_PROVIDERS) {
                        if ((provider.needsProxy && !provider.useGoogleTranslate) || provider.overrideProxy) validProviders.push(provider);
                    }
                } else if (type === "META") {
                    for (const provider of META_PROVIDERS) {
                        if ((provider.needsProxy && !provider.useGoogleTranslate) || provider.overrideProxy) validProviders.push(provider);
                    }
                } else {
                    console.log(colors.red("Invalid type provided: ") + type);
                }

                if (validProviders.length === 0) {
                    return resolve(undefined);
                }

                const data = [];

                for (const provider of validProviders) {
                    console.log(colors.gray("Testing ") + provider.id + colors.gray("."));
                    provider.customProxy = `http://${ip.ip}:${ip.port}`;
                    const original = provider.useGoogleTranslate;
                    provider.useGoogleTranslate = false;

                    let providerResponse;
                    if (provider.providerType === ProviderType.ANIME || provider.providerType === ProviderType.MANGA || provider.providerType === ProviderType.META) {
                        providerResponse = await (provider as AnimeProvider | MangaProvider | MetaProvider).search("Mushoku Tensei", Format.TV).catch(() => {
                            return undefined;
                        });
                    } else if (provider.providerType === ProviderType.BASE) {
                        providerResponse = await (provider as BaseProvider)
                            .search("Mushoku Tensei", provider.formats.includes(Format.TV) ? Type.ANIME : provider.formats.includes(Format.MANGA) || provider.formats.includes(Format.NOVEL) ? Type.MANGA : Type.ANIME, provider.formats, 0, 10)
                            .catch(() => {
                                return undefined;
                            });
                    } else {
                        providerResponse = undefined;
                    }

                    provider.useGoogleTranslate = original;

                    provider.customProxy = undefined;

                    if (!providerResponse) {
                        break;
                    }

                    console.log(colors.green(`${provider.id} passed.`));
                    data.push(provider.id);
                }

                return resolve(data);
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
