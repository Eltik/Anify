import { CORS_PROXIES } from "../proxies";
import colors from "colors";

export default class Http {
    private static bannedProxies: string[] = [];
    public static unbannedProxies: string[] | undefined = Array.isArray(CORS_PROXIES) ? CORS_PROXIES : undefined;

    static updateBannedProxies(proxyUrl: string): void {
        if (!this.unbannedProxies) this.unbannedProxies = Array.isArray(CORS_PROXIES) ? CORS_PROXIES : [];

        if (!this.bannedProxies.includes(proxyUrl)) {
            this.bannedProxies.push(proxyUrl);
            this.unbannedProxies = CORS_PROXIES.filter((proxy) => !this.bannedProxies.includes(proxy));
        }
    }

    static getRandomUnbannedProxy(): string | undefined {
        if (!this.unbannedProxies) this.unbannedProxies = Array.isArray(CORS_PROXIES) ? CORS_PROXIES : [];

        if (this.unbannedProxies.length === 0) return undefined;

        return this.unbannedProxies[Math.floor(Math.random() * this.unbannedProxies.length)];
    }

    static async request(url: string, config: RequestInit = {}, proxyRequest = true, requests = 0, customProxy: string | undefined = undefined): Promise<Response> {
        return new Promise(async (resolve, reject) => {
            try {
                if (proxyRequest) {
                    const proxyUrl = customProxy || this.getRandomUnbannedProxy();
                    if (!proxyUrl) {
                        return Promise.reject(new Error("No unbanned proxies available"));
                    }

                    const modifyUrl = `${proxyUrl}/${url}`;

                    const controller = new AbortController();
                    const id = setTimeout(() => {
                        this.updateBannedProxies(proxyUrl);
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
                        return resolve(response);
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
                return resolve({
                    ok: false,
                    status: 500,
                    statusText: "Internal Server Error",
                } as Response);
            }
        });
    }
}
