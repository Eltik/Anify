import type { IRequestConfig } from "../../../types/impl/proxies";
import { ProxyAgent } from "undici";
import { updateProxyHealth, proxyCache } from "../manager";
import { getRandomProxy } from "../manager/impl/getRandomProxy";

export async function customRequest(url: string, options: IRequestConfig = {}): Promise<Response> {
    const { isChecking, proxy, useGoogleTranslate, timeout, providerType, providerId, maxRetries } = options;

    let attempts = 0;
    while (attempts < (isChecking ? 1 : maxRetries || 3)) {
        attempts++;

        const proxyURL = isChecking ? proxy : useGoogleTranslate ? null : proxy && attempts === 1 ? proxy : providerType && providerId ? await getRandomProxy(providerType, providerId) : null;

        if (useGoogleTranslate) {
            url = "http://translate.google.com/translate?sl=ja&tl=en&u=" + encodeURIComponent(url);
        }

        const startTime = Date.now();
        try {
            const fetchOptions: RequestInit = {
                ...options,
            };

            if (proxyURL) {
                Object.assign(fetchOptions, {
                    dispatcher: new ProxyAgent(proxyURL),
                });
            }

            const timeoutPromise = new Promise<Response>((_, reject) => {
                setTimeout(() => reject(new Error("Request timed out")), timeout || 5000);
            });

            const fetchPromise = fetch(url, fetchOptions);
            const response = await Promise.race([fetchPromise, timeoutPromise]);

            // Update proxy health metrics on success
            if (!isChecking && providerType && providerId && proxyURL) {
                const responseTime = Date.now() - startTime;
                // Find the existing proxy in the cache
                const [ip, port] = proxyURL.replace("http://", "").split(":");
                const existingProxy = proxyCache.proxies.find((p) => p.ip === ip && p.port === Number(port));
                if (existingProxy) {
                    updateProxyHealth(existingProxy, true, providerType, providerId, responseTime);
                }
            }

            return response;
        } catch (error) {
            const checkError = error instanceof Error && (error.message.includes("Request timed out") || error.message.includes("socket connection was closed") || error.message.includes("unable to verify the first certificate") || error.message.includes("certificate has expired"));

            if (!isChecking && providerType && providerId && proxyURL && checkError) {
                if (!useGoogleTranslate) {
                    // Update proxy health metrics on failure
                    const responseTime = Date.now() - startTime;
                    // Find the existing proxy in the cache
                    const [ip, port] = proxyURL.replace("http://", "").split(":");
                    const existingProxy = proxyCache.proxies.find((p) => p.ip === ip && p.port === Number(port));
                    if (existingProxy) {
                        updateProxyHealth(existingProxy, false, providerType, providerId, responseTime);
                    }
                }
            } else if (!isChecking) {
                console.log((error as Error).message);
            }
        }
    }

    throw new Error("Max retry attempts reached");
}
