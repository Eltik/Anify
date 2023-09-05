import { CORS_PROXIES } from "../proxies";
import colors from "colors";

export default class Http {
    private static bannedProxies: string[] = [];
    public static unbannedProxies: string[] = CORS_PROXIES;

    static updateBannedProxies(proxyUrl: string): void {
        if (!this.bannedProxies.includes(proxyUrl)) {
            this.bannedProxies.push(proxyUrl);
            this.unbannedProxies = CORS_PROXIES.filter((proxy) => !this.bannedProxies.includes(proxy));
        }
    }

    static getRandomUnbannedProxy(): string | undefined {
        if (this.unbannedProxies.length === 0) {
            //throw new Error("No unbanned proxies available");
            return undefined;
        }
        return this.unbannedProxies[Math.floor(Math.random() * this.unbannedProxies.length)];
    }

    static async request(url: string, config: RequestInit = {}, proxyRequest = true, requests = 0, customProxy: string | undefined = undefined): Promise<Response> {
        try {
            if (proxyRequest) {
                const proxyUrl = customProxy ? customProxy + "/" : this.getRandomUnbannedProxy() != undefined ? `${this.getRandomUnbannedProxy()}/` : "";
                const modifyUrl = proxyUrl + url;

                const controller = new AbortController();
                const id = setTimeout(() => {
                    this.updateBannedProxies(proxyUrl);
                    controller.abort();
                }, 8000);

                try {
                    config = {
                        ...config,
                        headers: {
                            ...config.headers,
                            Origin: "https://anify.tv",
                        },
                    };
                    const response = await fetch(modifyUrl, { signal: controller.signal, ...config }).catch((err) => {
                        return {
                            ok: false,
                            status: 500,
                            statusText: "Timeout",
                            json: () => Promise.resolve({ error: err }),
                        } as Response;
                    });
                    if (!response.ok) {
                        this.updateBannedProxies(proxyUrl);
                    }

                    if (response.statusText === "Timeout") {
                        if (requests >= 3) {
                            console.log(colors.red("Request timed out. Retried 3 times. Aborting..."));
                            return response;
                        }

                        return this.request(url, config, proxyRequest, requests + 1);
                    }

                    clearTimeout(id);
                    return response;
                } catch (error) {
                    console.log(proxyUrl);
                    clearTimeout(id);
                    throw error;
                }
            } else {
                return fetch(url, config);
            }
        } catch (e) {
            console.log(e);
            return {
                ok: false,
                status: 500,
                statusText: "Internal Server Error",
            } as Response;
        }
    }
}
