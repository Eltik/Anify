import { env } from "../../../env";
import type { IRequestConfig } from "../../../types/impl/proxies";
import { updateProxyHealth, proxyCache, selectProxy, proxyToUrl } from "../manager";

export async function customRequest(url: string, options: IRequestConfig = {}): Promise<Response> {
    const { isChecking, proxy, useGoogleTranslate, timeout, providerType, providerId, maxRetries, validateResponse } = options;

    let attempts = 0;
    while (attempts < (isChecking ? 1 : maxRetries || 3)) {
        attempts++;

        if (!useGoogleTranslate && !isChecking && env.USE_WIREGUARD) {
            // First try CloudFlare worker proxy
            try {
                const fetchOptions: RequestInit = {
                    ...options,
                    headers: {
                        ...options.headers,
                    },
                };

                const timeoutPromise = new Promise<Response>((_, reject) => {
                    setTimeout(() => reject(new Error("Request timed out")), timeout || 10000);
                });

                // Construct the worker URL properly
                const fetchPromise = fetch(url, fetchOptions);

                try {
                    const response = await Promise.race([fetchPromise, timeoutPromise]);

                    // Check if response is ok before validation
                    if (!response.ok) {
                        throw new Error(`WireGuard request responded with status ${response.status} for ${url}.`);
                    }

                    // Validate the response if a validator is provided
                    if (!validateResponse || (await validateResponse(response.clone()))) {
                        return response;
                    }
                } catch (error) {
                    throw new Error(`WireGuard request failed: ${error instanceof Error ? error.message : String(error)}`);
                }
            } catch (error) {
                console.error("WireGuard proxy failed:", error instanceof Error ? error.message : String(error));
                // If WireGuard proxy fails and we have a stored proxy URL, use it
                if (options._proxyURL) {
                    options.proxy = options._proxyURL;
                }
                // Continue to CORS proxy attempt
            }
        }

        // Use provided proxy for first attempt or checking, otherwise select best proxy
        const proxyURL = isChecking ? proxy : useGoogleTranslate ? null : proxy && attempts === 1 ? proxy : providerType && providerId ? proxyToUrl(selectProxy(providerType, providerId)) : null;

        if (useGoogleTranslate) {
            url = "http://translate.google.com/translate?sl=ja&tl=en&u=" + encodeURIComponent(url);
        }

        const startTime = Date.now();
        try {
            const fetchOptions: RequestInit = {
                ...options,
            };

            if (proxyURL) {
                url = `${proxyURL}/${url}`;
                fetchOptions.headers = {
                    ...options.headers,
                    Origin: "https://anify.tv",
                };
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

    throw new Error(`Max retry attempts reached for ${url}. Provider ID: ${providerId} | Provider Type: ${providerType}`);
}
