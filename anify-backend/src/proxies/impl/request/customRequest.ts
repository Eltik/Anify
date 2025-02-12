import { env } from "../../../env";
import type { IRequestConfig } from "../../../types/impl/proxies";
import { updateProxyHealth, proxyCache, selectProxy, proxyToUrl } from "../manager";
import { wireguardProxyManager } from "../wireguard";

// Track consecutive errors per provider and per status code
const errorTracker = new Map<
    string,
    {
        count: number;
        lastRotation: number;
        statusCodes: Map<number, number>; // Track frequency of each status code
    }
>();

const ROTATION_THRESHOLD = 5; // Base threshold for weighted errors
const ROTATION_COOLDOWN = 60000; // 1 minute cooldown between rotations
const STATUS_CODE_WEIGHTS: Record<number, number> = {
    503: 2.5, // Service unavailable - likely rate limit
    429: 5, // Explicit rate limit - rotate quickly
    404: 0.2, // Not found - much less important
    999: 1.5, // Timeout errors
};

// Minimum occurrences needed for specific status codes before considering rotation
const MIN_OCCURRENCES: Record<number, number> = {
    503: 2, // Need at least 2 service unavailable errors
    429: 1, // Single rate limit is significant
    404: 10, // Need many 404s to trigger rotation
    999: 3, // Need several timeouts
};

function shouldRotateIP(errorState: { count: number; lastRotation: number; statusCodes: Map<number, number> }): boolean {
    // Don't rotate if we're still in cooldown
    if (Date.now() - errorState.lastRotation < ROTATION_COOLDOWN) {
        return false;
    }

    let weightedCount = 0;
    let hasSignificantErrors = false;

    // Check if we have enough occurrences of any specific status code
    errorState.statusCodes.forEach((count, statusCode) => {
        const minRequired = MIN_OCCURRENCES[statusCode] ?? 5;
        const weight = STATUS_CODE_WEIGHTS[statusCode] ?? 1;

        if (count >= minRequired) {
            hasSignificantErrors = true;
        }

        weightedCount += count * weight;
    });

    // Only rotate if we have both enough weighted errors AND a significant pattern
    return weightedCount >= ROTATION_THRESHOLD && hasSignificantErrors;
}

export async function customRequest(url: string, options: IRequestConfig = {}): Promise<Response> {
    const { isChecking, proxy, useGoogleTranslate, timeout, providerType, providerId, maxRetries, validateResponse } = options;

    let attempts = 0;
    while (attempts < (isChecking ? 1 : maxRetries || 3)) {
        attempts++;

        if (!useGoogleTranslate && !isChecking && env.USE_WIREGUARD) {
            const providerKey = `${providerType}-${providerId}`;
            const errorState = errorTracker.get(providerKey) || {
                count: 0,
                lastRotation: 0,
                statusCodes: new Map(),
            };

            // Check if we need to rotate IP based on error patterns
            if (shouldRotateIP(errorState)) {
                try {
                    await wireguardProxyManager.rotate();
                    // Reset error tracking after rotation
                    errorTracker.set(providerKey, {
                        count: 0,
                        lastRotation: Date.now(),
                        statusCodes: new Map(),
                    });
                    console.log(`Rotated IP for provider ${providerKey} due to error threshold`);

                    // Add a small delay after rotation to ensure the new connection is ready
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                } catch (error) {
                    console.error("Failed to rotate WireGuard IP:", error);
                }
            }

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

                const fetchPromise = fetch(url, fetchOptions);

                try {
                    const response = await Promise.race([fetchPromise, timeoutPromise]);

                    if (!response.ok) {
                        // Track the specific status code
                        const currentCount = errorState.statusCodes.get(response.status) || 0;
                        errorState.statusCodes.set(response.status, currentCount + 1);
                        errorState.count++;
                        errorTracker.set(providerKey, errorState);

                        throw new Error(`WireGuard request responded with status ${response.status} for ${url}.`);
                    }

                    if (!validateResponse || (await validateResponse(response.clone()))) {
                        // Reset error tracking on successful request
                        errorTracker.set(providerKey, {
                            count: 0,
                            lastRotation: errorState.lastRotation,
                            statusCodes: new Map(),
                        });
                        return response;
                    }
                } catch (error) {
                    throw new Error(`WireGuard request failed: ${error instanceof Error ? error.message : String(error)}`);
                }
            } catch (error) {
                // Update error tracking
                if (providerType && providerId) {
                    // If it's a timeout error, track it as a special status code (like 999)
                    if (error instanceof Error && error.message.includes("timeout")) {
                        const currentCount = errorState.statusCodes.get(999) || 0;
                        errorState.statusCodes.set(999, currentCount + 1);
                    }

                    errorState.count++;
                    errorTracker.set(providerKey, errorState);
                }

                if (options._proxyURL) {
                    options.proxy = options._proxyURL;
                }
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
