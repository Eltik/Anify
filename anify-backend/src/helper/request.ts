import colors from "colors";
import { ANIME_PROXIES, BASE_PROXIES, MANGA_PROXIES, META_PROXIES } from "../proxies";

export default class Http {
    private static bannedProxies: {
        base: string[];
        anime: string[];
        manga: string[];
        meta: string[];
    } = {
        base: [],
        anime: [],
        manga: [],
        meta: [],
    };

    public static unbannedProxies: {
        base: string[];
        anime: string[];
        manga: string[];
        meta: string[];
    } = {
        base: Array.isArray(BASE_PROXIES) ? BASE_PROXIES : [],
        anime: Array.isArray(ANIME_PROXIES) ? ANIME_PROXIES : [],
        manga: Array.isArray(MANGA_PROXIES) ? MANGA_PROXIES : [],
        meta: Array.isArray(META_PROXIES) ? META_PROXIES : [],
    };

    static updateBannedProxies(proxyType: "BASE" | "ANIME" | "MANGA" | "META", proxyUrl: string): void {
        if (!this.unbannedProxies[proxyType.toLowerCase() as "base" | "anime" | "manga" | "meta"]) this.unbannedProxies[proxyType.toLowerCase() as "base" | "anime" | "manga" | "meta"] = proxyType === "BASE" ? (Array.isArray(BASE_PROXIES) ? BASE_PROXIES : []) : proxyType === "ANIME" ? (Array.isArray(ANIME_PROXIES) ? ANIME_PROXIES : []) : proxyType === "MANGA" ? (Array.isArray(MANGA_PROXIES) ? MANGA_PROXIES : []) : proxyType === "META" ? (Array.isArray(META_PROXIES) ? META_PROXIES : []) : [];

        if (!this.bannedProxies[proxyType.toLowerCase() as "base" | "anime" | "manga" | "meta"].includes(proxyUrl)) {
            this.bannedProxies[proxyType.toLowerCase() as "base" | "anime" | "manga" | "meta"].push(proxyUrl);
            this.unbannedProxies[proxyType.toLowerCase() as "base" | "anime" | "manga" | "meta"] = (proxyType === "BASE" ? (Array.isArray(BASE_PROXIES) ? BASE_PROXIES : []) : proxyType === "ANIME" ? (Array.isArray(ANIME_PROXIES) ? ANIME_PROXIES : []) : proxyType === "MANGA" ? (Array.isArray(MANGA_PROXIES) ? MANGA_PROXIES : []) : proxyType === "META" ? (Array.isArray(META_PROXIES) ? META_PROXIES : []) : []).filter((proxy) => !this.bannedProxies[proxyType.toLowerCase() as "base" | "anime" | "manga" | "meta"].includes(proxy));
        }
    }

    static getRandomUnbannedProxy(proxyType: "BASE" | "ANIME" | "MANGA" | "META"): string | undefined {
        if (!this.unbannedProxies[proxyType.toLowerCase() as "base" | "anime" | "manga" | "meta"]) this.unbannedProxies[proxyType.toLowerCase() as "base" | "anime" | "manga" | "meta"] = proxyType === "BASE" ? (Array.isArray(BASE_PROXIES) ? BASE_PROXIES : []) : proxyType === "ANIME" ? (Array.isArray(ANIME_PROXIES) ? ANIME_PROXIES : []) : proxyType === "MANGA" ? (Array.isArray(MANGA_PROXIES) ? MANGA_PROXIES : []) : proxyType === "META" ? (Array.isArray(META_PROXIES) ? META_PROXIES : []) : [];

        if (this.unbannedProxies[proxyType.toLowerCase() as "base" | "anime" | "manga" | "meta"].length === 0) return undefined;

        return this.unbannedProxies[proxyType.toLowerCase() as "base" | "anime" | "manga" | "meta"][Math.floor(Math.random() * this.unbannedProxies[proxyType.toLowerCase() as "base" | "anime" | "manga" | "meta"].length)];
    }

    static async request(proxyType: "BASE" | "ANIME" | "MANGA" | "META", url: string, config: RequestInit = {}, proxyRequest = true, requests = 0, customProxy: string | undefined = undefined): Promise<Response> {

        return new Promise(async (resolve, reject) => {
            try {
                if (proxyRequest) {
                    const proxyUrl = customProxy || this.getRandomUnbannedProxy(proxyType);
                    if (!proxyUrl) {
                        throw new Error("No proxy available.");
                    }

                    const modifyUrl = `${proxyUrl}/${url}`;

                    const controller = new AbortController();
                    const id = setTimeout(() => {
                        this.updateBannedProxies(proxyType, proxyUrl);
                        controller.abort();
                    }, 5000);

                    controller.signal.addEventListener("abort", () => {
                        console.log(colors.red(`http://${proxyUrl} aborted.`));

                        return resolve({
                            ok: false,
                            status: 500,
                            statusText: "Timeout",
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
                        const response = await fetch(modifyUrl, { signal: controller.signal, ...config }).catch(
                            (err) =>
                                ({
                                    ok: false,
                                    status: 500,
                                    statusText: "Timeout",
                                    json: () => Promise.resolve({ error: err }),
                                }) as Response,
                        );

                        if (!response.ok) {
                            this.updateBannedProxies(proxyType, proxyUrl);
                        }

                        if (response.statusText === "Timeout") {
                            if (requests >= 3) {
                                console.log(colors.red("Request timed out. Retried 3 times. Aborting..."));
                                return response;
                            }

                            return this.request(proxyType, url, config, proxyRequest, requests + 1);
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
                return resolve({
                    ok: false,
                    status: 500,
                    statusText: "Internal Server Error",
                } as Response);
            }
        });
    }
}
