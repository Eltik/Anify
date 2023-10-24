import colors from "colors";
import { ANIME_PROXIES, BASE_PROXIES, MANGA_PROXIES, META_PROXIES } from "../proxies";
import { ANIME_PROVIDERS, BASE_PROVIDERS, MANGA_PROVIDERS, META_PROVIDERS } from "../mappings";

export default class Http {
    public static unbannedProxies: {
        base: { providerId: string; ip: string }[];
        anime: { providerId: string; ip: string }[];
        manga: { providerId: string; ip: string }[];
        meta: { providerId: string; ip: string }[];
    } = {
        base: Array.isArray(BASE_PROXIES) ? BASE_PROXIES : [],
        anime: Array.isArray(ANIME_PROXIES) ? ANIME_PROXIES : [],
        manga: Array.isArray(MANGA_PROXIES) ? MANGA_PROXIES : [],
        meta: Array.isArray(META_PROXIES) ? META_PROXIES : [],
    };

    static getRandomUnbannedProxy(providerId: string): string | undefined {
        const proxyType = BASE_PROVIDERS.find((provider) => provider.id === providerId) !== undefined ? "BASE" : ANIME_PROVIDERS.find((provider) => provider.id === providerId) !== undefined ? "ANIME" : MANGA_PROVIDERS.find((provider) => provider.id === providerId) !== undefined ? "MANGA" : META_PROVIDERS.find((provider) => provider.id === providerId) !== undefined ? "META" : undefined;
        if (!proxyType) return undefined;

        if (!this.unbannedProxies[proxyType.toLowerCase() as "base" | "anime" | "manga" | "meta"]) {
            this.unbannedProxies[proxyType.toLowerCase() as "base" | "anime" | "manga" | "meta"] = proxyType === "BASE" ? (Array.isArray(BASE_PROXIES) ? BASE_PROXIES : []) : proxyType === "ANIME" ? (Array.isArray(ANIME_PROXIES) ? ANIME_PROXIES : []) : proxyType === "MANGA" ? (Array.isArray(MANGA_PROXIES) ? MANGA_PROXIES : []) : proxyType === "META" ? (Array.isArray(META_PROXIES) ? META_PROXIES : []) : [];
        }

        if (this.unbannedProxies[proxyType.toLowerCase() as "base" | "anime" | "manga" | "meta"].length === 0) return undefined;

        const providerProxies = this.unbannedProxies[proxyType.toLowerCase() as "base" | "anime" | "manga" | "meta"].filter((proxy) => proxy.providerId === providerId);

        return providerProxies[Math.floor(Math.random() * providerProxies.length)].ip;
    }

    static async request(providerId: string, useGoogleTranslate: boolean, url: string, config: RequestInit = {}, proxyRequest = true, requests = 0, customProxy: string | undefined = undefined): Promise<Response> {
        return new Promise(async (resolve, reject) => {
            try {
                if (proxyRequest) {
                    const proxyUrl = useGoogleTranslate ? "http://translate.google.com/translate?sl=ja&tl=en&u=" : customProxy || this.getRandomUnbannedProxy(providerId);
                    if (!proxyUrl) {
                        throw new Error("No proxy available.");
                    }

                    const modifyUrl = useGoogleTranslate ? `${proxyUrl}${encodeURIComponent(url)}` : `${proxyUrl}/${url}`;

                    const controller = new AbortController();
                    const id = setTimeout(() => {
                        controller.abort();
                    }, 10000);

                    controller.signal.addEventListener("abort", () => {
                        return resolve({
                            ok: false,
                            status: 500,
                            statusText: "Timeout",
                            text: () => Promise.resolve(""),
                            json: () => Promise.resolve({ error: "Timeout" }),
                        } as Response);
                    });

                    try {
                        config = {
                            ...config,
                            headers: {
                                ...config.headers,
                                Origin: "https://anify.tv",
                            },
                        };
                        const response = await fetch(modifyUrl, {
                            signal: controller.signal,
                            ...config,
                        }).catch(
                            (err) =>
                                ({
                                    ok: false,
                                    status: 500,
                                    statusText: "Timeout",
                                    json: () => Promise.resolve({ error: err }),
                                }) as Response,
                        );

                        if (response.statusText === "Timeout") {
                            if (requests >= 3) {
                                console.log(colors.red("Request timed out. Retried 3 times. Aborting..."));
                                return response;
                            }

                            return this.request(providerId, useGoogleTranslate, url, config, proxyRequest, requests + 1);
                        }

                        clearTimeout(id);
                        return resolve(response);
                    } catch (error) {
                        console.log(proxyUrl);
                        clearTimeout(id);
                        throw error;
                    }
                } else {
                    return resolve(fetch(url, config));
                }
            } catch (e) {
                console.log(e);
                throw e;
            }
        });
    }
}
