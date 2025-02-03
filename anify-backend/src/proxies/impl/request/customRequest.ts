import type { IRequestConfig } from "../../../types/impl/proxies";
import { ProxyAgent } from "undici";
import { SocksProxyAgent } from "socks-proxy-agent";
import { updateProxyHealth, proxyCache, selectProxy, proxyToUrl } from "../manager";
import fetch, { type RequestInit, type Response } from "node-fetch";

export async function customRequest(url: string, options: IRequestConfig = {}): Promise<Response> {
    const { isChecking, proxy, useGoogleTranslate, timeout, providerType, providerId, maxRetries, validateResponse } = options;

    let attempts = 0;
    while (attempts < (isChecking ? 1 : maxRetries || 3)) {
        attempts++;

        // Use provided proxy for first attempt or checking, otherwise select best proxy
        const proxyURL = isChecking ? proxy : useGoogleTranslate ? null : proxy && attempts === 1 ? proxy : providerType && providerId ? proxyToUrl(selectProxy(providerType, providerId, attempts > 1, attempts)) : null;

        if (useGoogleTranslate) {
            url = "http://translate.google.com/translate?sl=ja&tl=en&u=" + encodeURIComponent(url);
        }

        const startTime = Date.now();
        try {
            const fetchOptions: RequestInit = {
                ...options,
            };

            if (proxyURL) {
                // Determine if it's a SOCKS5 or HTTP proxy based on the URL scheme
                if (proxyURL.startsWith("socks5://")) {
                    Object.assign(fetchOptions, {
                        agent: new SocksProxyAgent(proxyURL),
                    });
                } else {
                    Object.assign(fetchOptions, {
                        dispatcher: new ProxyAgent(proxyURL),
                    });
                }
            }

            const timeoutPromise = new Promise<Response>((_, reject) => {
                // Increase timeout for proxy checks to 15 seconds
                setTimeout(() => reject(new Error("Request timed out")), isChecking ? 15000 : timeout || 5000);
            });

            const fetchPromise = fetch(url, fetchOptions);
            const response = await Promise.race([fetchPromise, timeoutPromise]);

            // Update proxy health metrics based on response validation
            if (!isChecking && providerType && providerId && proxyURL) {
                const responseTime = Date.now() - startTime;
                // Find the existing proxy in the cache
                const [ip, port] = proxyURL.replace("http://", "").split(":");
                const existingProxy = proxyCache.proxies.find((p) => p.ip === ip && p.port === Number(port));

                if (existingProxy) {
                    let isValid = true;
                    if (validateResponse) {
                        // Clone the response since validation might need to read the body
                        const clonedResponse = response.clone();
                        try {
                            isValid = await validateResponse(clonedResponse);
                        } catch {
                            isValid = false;
                        }
                    }
                    updateProxyHealth(existingProxy, isValid, providerType, providerId, responseTime);
                }
            }

            return response;
        } catch (error) {
            const checkError = error instanceof Error && (error.message.includes("Request timed out") || error.message.includes("socket connection was closed") || error.message.includes("unable to verify the first certificate") || error.message.includes("certificate has expired"));

            if (!isChecking && providerType && providerId && proxyURL && checkError) {
                if (!useGoogleTranslate) {
                    const responseTime = Date.now() - startTime;
                    // Find the existing proxy in the cache
                    const [ip, port] = proxyURL.replace("http://", "").split(":");
                    const existingProxy = proxyCache.proxies.find((p) => p.ip === ip && p.port === Number(port));
                    if (existingProxy) {
                        updateProxyHealth(existingProxy, false, providerType, providerId, responseTime);
                    }
                }
            }
        }
    }

    throw new Error("Max retry attempts reached");
}
