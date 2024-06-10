import colors from "colors";
import { ANIME_PROXIES, BASE_PROXIES, MANGA_PROXIES, META_PROXIES } from "../proxies";
import { ANIME_PROVIDERS, BASE_PROVIDERS, MANGA_PROVIDERS, META_PROVIDERS } from "../mappings";

/**
 * @description Main request helper class. Manages CORS proxies and Google Translate proxy.
 */
export default class Http {
    // List of proxies for each provider.
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

    /**
     * @description Loops through the unbannedProxies variable to find a random proxy for the provider.
     * @param providerId Provider ID
     * @returns string | undefined
     */
    static getRandomUnbannedProxy(providerId: string): string | undefined {
        // Find the proxy type (base, anime, manga, meta)
        const proxyType =
            providerId === "novelupdates"
                ? "MANGA"
                : BASE_PROVIDERS.find((provider) => provider.id === providerId) !== undefined
                ? "BASE"
                : ANIME_PROVIDERS.find((provider) => provider.id === providerId) !== undefined
                ? "ANIME"
                : MANGA_PROVIDERS.find((provider) => provider.id === providerId) !== undefined
                ? "MANGA"
                : META_PROVIDERS.find((provider) => provider.id === providerId) !== undefined
                ? "META"
                : undefined;
        if (!proxyType) return undefined;

        // Bun likes to do things where it doesn't initialize the unbannedProxies variable.
        if (!this.unbannedProxies[proxyType.toLowerCase() as "base" | "anime" | "manga" | "meta"]) {
            this.unbannedProxies[proxyType.toLowerCase() as "base" | "anime" | "manga" | "meta"] =
                proxyType === "BASE"
                    ? Array.isArray(BASE_PROXIES)
                        ? BASE_PROXIES
                        : []
                    : proxyType === "ANIME"
                    ? Array.isArray(ANIME_PROXIES)
                        ? ANIME_PROXIES
                        : []
                    : proxyType === "MANGA"
                    ? Array.isArray(MANGA_PROXIES)
                        ? MANGA_PROXIES
                        : []
                    : proxyType === "META"
                    ? Array.isArray(META_PROXIES)
                        ? META_PROXIES
                        : []
                    : [];
        }

        // If there are no proxies, return undefined.
        if (this.unbannedProxies[proxyType.toLowerCase() as "base" | "anime" | "manga" | "meta"].length === 0) return undefined;

        const providerProxies = this.unbannedProxies[proxyType.toLowerCase() as "base" | "anime" | "manga" | "meta"].filter((proxy) => proxy.providerId === providerId);
        if (!providerProxies) return undefined;

        return providerProxies[Math.floor(Math.random() * providerProxies.length)]?.ip ?? undefined;
    }

    /**
     * @description Main request function. Sends a request to the URL with the specified config.
     * @param providerId Provider ID
     * @param useGoogleTranslate Whether to use Google Translate proxy or not.
     * @param url URL to send a request to
     * @param config Native fetch() config
     * @param proxyRequest Whether to proxy the request or not.
     * @param requests Number of requests sent (for retry purposes)
     * @param customProxy Whether to use a specific proxy or not. Mainly for checking CORS proxies.
     * @returns Promise<Response>
     */
    static async request(providerId: string, useGoogleTranslate: boolean, url: string, config: RequestInit = {}, proxyRequest = true, requests = 0, customProxy: string | undefined = undefined): Promise<Response> {
        return new Promise(async (resolve) => {
            try {
                // If proxyRequest is true, use a proxy.
                if (proxyRequest) {
                    // Get the proxy URL.
                    const proxyUrl = useGoogleTranslate ? "http://translate.google.com/translate?sl=ja&tl=en&u=" : customProxy || this.getRandomUnbannedProxy(providerId);
                    if (!proxyUrl) {
                        return resolve({
                            ok: false,
                            status: 500,
                            statusText: "No proxy available.",
                            text: () => Promise.resolve(""),
                            json: () => Promise.resolve({ error: "No proxy available." }),
                        } as Response);
                    }

                    // Modify the URL to use the proxy.
                    const modifyUrl = useGoogleTranslate ? `${proxyUrl}${encodeURIComponent(url)}` : `${proxyUrl}/${url}`;

                    // Create an AbortController to abort the request after 10 seconds.
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
                        // CORS proxies require the Origin header to be set to the website's URL.
                        config = {
                            ...config,
                            headers: {
                                ...config.headers,
                                Origin: "https://anify.tv",
                            },
                        };

                        // Send the request
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

                        // Retry up to a max of 3 times.
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
