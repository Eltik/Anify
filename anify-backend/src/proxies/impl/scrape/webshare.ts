import { env } from "../../../env";
import type { IProxy } from "../../../types/impl/proxies";
import { join } from "path";
import type { IWebshareListResponse, IWebshareProxy } from "../../../types/impl/proxies/impl/webshare";

/**
 * Scraper for fetching proxies from Webshare.io
 */
export class WebshareScraper {
    private apiKey: string;
    private apiURL = "https://proxy.webshare.io/api/v2/"; // Default or example API URL

    constructor(apiKey?: string) {
        this.apiKey = apiKey || env.WEBSHARE_API_KEY || "";
        if (!this.apiKey) {
            console.warn("Webshare API key not provided. Please set the WEBSHARE_API_KEY environment variable.");
            // Optionally throw an error if the key is absolutely required
            // throw new Error("Webshare API key is required.");
        }
    }

    /**
     * Fetches proxies from the Webshare API.
     * @returns A promise that resolves to an array of IProxy objects.
     */
    async scrapeProxies(): Promise<IProxy[]> {
        if (!this.apiKey) {
            console.error("Cannot scrape Webshare proxies without an API key.");
            return [];
        }

        try {
            // Example: Fetching proxy list - Adjust endpoint and parameters as needed
            const endpoint = `${this.apiURL}proxy/list/?mode=direct&page=1&page_size=100`; // Example endpoint
            const response = await fetch(endpoint, {
                headers: {
                    Authorization: `Token ${this.apiKey}`,
                },
            });

            if (!response.ok) {
                throw new Error(`Webshare API request failed with status ${response.status}: ${await response.text()}`);
            }

            const data = (await response.json()) as IWebshareListResponse;

            // TODO: Add more robust validation and error handling for the API response structure
            if (!data || !data.results || !Array.isArray(data.results)) {
                console.error("Invalid response format from Webshare API:", data);
                throw new Error("Invalid response format from Webshare API");
            }

            // Map the Webshare response format to the IProxy format
            const proxies: IProxy[] = data.results
                .map((proxy: IWebshareProxy): IProxy | null => {
                    // TODO: Add more validation based on specific needs (e.g., https_support)
                    if (!proxy || typeof proxy.proxy_address !== "string" || typeof proxy.port !== "number" || !proxy.valid) {
                        console.warn("Skipping invalid proxy entry from Webshare:", proxy);
                        return null; // Skip invalid entries
                    }
                    return {
                        id: crypto.randomUUID(),
                        ip: proxy.proxy_address,
                        port: proxy.port,
                        // Assume http/https based on Webshare documentation or proxy_type field if available
                        // Defaulting to 'http' here, adjust as necessary.
                        protocol: proxy.proxy_type === "socks5" ? "socks5" : "http",
                        country: proxy.country_code || "Unknown",
                        source: "webshare",
                        username: proxy.username, // Include authentication if provided
                        password: proxy.password, // Include authentication if provided
                        providerMetrics: {}, // Initialize empty provider metrics
                    };
                })
                .filter((p: IProxy | null): p is IProxy => p !== null); // Filter out null values from invalid entries

            await this.writeProxiesToFile(proxies);

            return proxies;
        } catch (error) {
            console.error("Error scraping proxies from Webshare:", error);
            return []; // Return empty array on error
        }
    }

    private async writeProxiesToFile(proxies: IProxy[]) {
        const filePath = join(process.cwd(), "proxies.json");
        const file = Bun.file(filePath);
        await file.write(JSON.stringify(proxies, null, 2));
    }

    // Optional: Add methods for health checks or other specific Webshare interactions
    async checkHealth(): Promise<boolean> {
        if (!this.apiKey) return false;
        try {
            // Example: Fetch account info or perform a simple request to check API key validity
            const endpoint = `${this.apiURL}profile/`;
            const response = await fetch(endpoint, {
                headers: {
                    Authorization: `Token ${this.apiKey}`,
                },
            });
            return response.ok;
        } catch (error) {
            console.error("Webshare health check failed:", error);
            return false;
        }
    }
}
