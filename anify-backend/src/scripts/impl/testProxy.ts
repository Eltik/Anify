import type { IProxy } from "../../types/impl/proxies";
// No specific proxy agent import needed for Bun's native fetch proxy option
import AniListBase from "../../mappings/impl/base/impl/anilist";
import { preloadProxies } from "../../proxies/impl/manager/impl/file/preloadProxies";

interface ProxyTestResult {
    success: boolean;
    responseTime?: number; // in milliseconds
    statusCode?: number;
    ipAddress?: string; // IP address seen by the test server
    error?: string;
    proxy: IProxy;
}

/**
 * Tests a given proxy by making a request to a test URL using Bun's native fetch proxy.
 * @param proxy The proxy to test.
 * @param testUrl The URL to use for testing. Defaults to "https://api.ipify.org?format=json".
 * @param timeout The timeout for the request in milliseconds. Defaults to 5000ms.
 * @param useAniListProvider Whether to use AniListBase for proxying.
 * @returns A Promise resolving to a ProxyTestResult.
 */
export async function testProxy(proxy: IProxy, testUrl = "https://api.ipify.org?format=json", timeout = 5000, useAniListProvider = true): Promise<ProxyTestResult> {
    await preloadProxies();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    const startTime = Date.now();
    const proxyUrlString = `${proxy.protocol}://${proxy.username && proxy.password ? `${proxy.username}:${proxy.password}@` : ""}${proxy.ip}:${proxy.port}`;

    try {
        // For SOCKS proxies, Bun's fetch might require a different format or might not support it via this option.
        // The documentation specifies http:// or https:// for the proxy option.
        if (proxy.protocol !== "http" && proxy.protocol !== "https") {
            clearTimeout(timeoutId);
            return {
                success: false,
                error: `Proxy protocol ${proxy.protocol} may not be supported by Bun\'s fetch proxy option (expects http/https).`,
                proxy,
            };
        }

        let response: Response;
        if (useAniListProvider) {
            const aniListProvider = new AniListBase();
            // Use a simple query to AniList API or the testUrl
            // Using testUrl to keep comparison consistent.
            // The `request` method in MediaProvider (parent of AniListBase) handles proxy configuration.
            response = await aniListProvider.request(testUrl, {
                proxy: proxyUrlString,
                signal: controller.signal,
                headers: {
                    "User-Agent": "Anify-Proxy-Tester/1.0",
                },
            });
        } else {
            response = await fetch(testUrl, {
                // Assumes global fetch is Bun's fetch
                proxy: proxyUrlString,
                signal: controller.signal,
                headers: {
                    "User-Agent": "Anify-Proxy-Tester/1.0",
                },
            });
        }

        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;

        if (!response.ok) {
            return {
                success: false,
                statusCode: response.status,
                responseTime,
                error: `Request failed with status: ${response.status}`,
                proxy,
            };
        }

        let ipAddress;
        try {
            if (testUrl.includes("api.ipify.org")) {
                const jsonResponse = await response.json();
                ipAddress = (jsonResponse as { ip: string }).ip;
            }
        } catch {
            /* Ignore if parsing IP fails */
        }

        return {
            success: true,
            statusCode: response.status,
            responseTime,
            ipAddress,
            proxy,
        };
    } catch (error: any) {
        clearTimeout(timeoutId);
        const responseTime = Date.now() - startTime;
        let errorMessage = "Unknown error";
        if (error instanceof Error) {
            errorMessage = error.message;
            if (error.name === "AbortError") {
                errorMessage = "Request timed out";
            }
        }
        return {
            success: false,
            responseTime: error.name === "AbortError" ? timeout : responseTime,
            error: errorMessage,
            proxy,
        };
    }
}
