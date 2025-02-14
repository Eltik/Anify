import { env } from "../../../env";
import type { IRequestConfig } from "../../../types/impl/proxies";
import { selectProxy, proxyToUrl } from "../manager";
import { wireguardProxyManager } from "../wireguard";

// Track consecutive errors per provider and per status code
const errorTracker = new Map<
    string,
    {
        count: number;
        lastRotation: number;
        statusCodes: Map<number, number>;
    }
>();

// Track rotation state
const rotationState = {
    isRotating: false,
    lastRotationStart: 0,
    rotationAttempts: new Map<string, number>(),
    maxAttempts: 3,
    requestQueue: new Map<string, Promise<void>>(), // Queue for pending requests per provider
    activeRequests: new Map<string, number>(), // Track active requests per provider
    maxConcurrentRequests: 5, // Max concurrent requests per provider
    rotationPromise: null as Promise<void> | null, // Track current rotation
};

const ROTATION_THRESHOLD = 3;
const ROTATION_COOLDOWN = 30000;
const STATUS_CODE_WEIGHTS: Record<number, number> = {
    503: 5, // Increase weight for service unavailable
    429: 10, // Increase weight for rate limits
    404: 0.2,
    400: 5, // Add weight for bad requests
    999: 5, // Increase weight for timeouts/general errors
};

const MIN_OCCURRENCES: Record<number, number> = {
    503: 1, // Lower threshold for service unavailable
    429: 1,
    404: 10,
    400: 1, // Single bad request is significant
    999: 1, // Single timeout is significant
};

// Add to state tracking
const activeControllers = new Map<string, AbortController>();

// Dynamic backoff calculation based on recent errors and rotation history
function calculateBackoff(providerKey: string): number {
    const attempts = rotationState.rotationAttempts.get(providerKey) || 0;
    const baseDelay = 1000; // 1 second base
    const jitter = Math.random() * 500; // Add some randomness
    return Math.min(baseDelay * Math.pow(1.5, attempts) + jitter, 10000); // Cap at 10 seconds
}

async function waitForRotation(providerKey: string): Promise<void> {
    // If there's an active rotation, wait for it to complete
    if (rotationState.rotationPromise) {
        await rotationState.rotationPromise;
        return;
    }

    // Get or create queue for this provider
    let queue = rotationState.requestQueue.get(providerKey);
    if (!queue) {
        queue = Promise.resolve();
        rotationState.requestQueue.set(providerKey, queue);
    }

    // Add request to queue
    const queuePromise = queue.then(async () => {
        const backoff = calculateBackoff(providerKey);
        await new Promise((resolve) => setTimeout(resolve, backoff));
    });
    rotationState.requestQueue.set(providerKey, queuePromise);

    // Wait for our turn
    await queuePromise;
}

async function rotateIPWithQueue(providerKey: string): Promise<void> {
    if (rotationState.isRotating) {
        await waitForRotation(providerKey);
        return;
    }

    // Create a new rotation promise
    rotationState.rotationPromise = (async () => {
        try {
            rotationState.isRotating = true;
            rotationState.lastRotationStart = Date.now();

            // Wait for all active requests to finish
            const activeRequests = rotationState.activeRequests.get(providerKey) || 0;
            if (activeRequests > 0) {
                console.log(`Waiting for ${activeRequests} active requests to complete before rotating IP...`);
                await new Promise((resolve) => setTimeout(resolve, 5000));
            }

            await wireguardProxyManager.rotate();

            errorTracker.set(providerKey, {
                count: 0,
                lastRotation: Date.now(),
                statusCodes: new Map(),
            });

            console.log(`Rotated IP for provider ${providerKey} due to error threshold`);
        } catch (error) {
            console.warn("Failed to rotate WireGuard IP:", error);
        } finally {
            rotationState.isRotating = false;
            rotationState.rotationAttempts.delete(providerKey);
            rotationState.requestQueue.delete(providerKey);
            rotationState.rotationPromise = null;
        }
    })();

    await rotationState.rotationPromise;
}

function shouldRotateIP(errorState: { count: number; lastRotation: number; statusCodes: Map<number, number> }): boolean {
    if (Date.now() - errorState.lastRotation < ROTATION_COOLDOWN || rotationState.isRotating) {
        return false;
    }

    let weightedCount = 0;
    let hasSignificantErrors = false;

    errorState.statusCodes.forEach((count, statusCode) => {
        const minRequired = MIN_OCCURRENCES[statusCode] ?? 5;
        const weight = STATUS_CODE_WEIGHTS[statusCode] ?? 1;

        if (count >= minRequired) {
            hasSignificantErrors = true;
        }
        weightedCount += count * weight;
    });

    return weightedCount >= ROTATION_THRESHOLD && hasSignificantErrors;
}

interface ExtendedRequestInit extends RequestInit {
    providerKey?: string;
    signal?: AbortSignal;
}

async function makeRequest(url: string, options: ExtendedRequestInit, timeout: number = 10000): Promise<Response | null> {
    const controller = new AbortController();
    const { signal: existingSignal, providerKey, ...restOptions } = options;

    // Create a combined signal if there's an existing one
    const signal = existingSignal ? AbortSignal.any([existingSignal, controller.signal]) : controller.signal;

    // Store controller for potential cleanup
    if (providerKey) {
        activeControllers.set(providerKey, controller);
    }

    const timeoutId = setTimeout(() => {
        controller.abort("timeout");
        // Clean up on timeout
        if (providerKey) {
            // Increment error count for timeouts
            const errorState = errorTracker.get(providerKey) || {
                count: 0,
                lastRotation: 0,
                statusCodes: new Map(),
            };
            const currentCount = errorState.statusCodes.get(999) || 0;
            errorState.statusCodes.set(999, currentCount + 2); // Increment by 2 for timeouts
            errorState.count += 2;
            errorTracker.set(providerKey, errorState);

            if (shouldRotateIP(errorState)) {
                rotateIPWithQueue(providerKey).catch(console.error);
            }
            abortProviderRequests(providerKey);
        }
    }, timeout);

    try {
        const response = await fetch(url, {
            ...restOptions,
            signal,
        });

        if (!response.ok) {
            if (providerKey) {
                // Increment error count for non-200 responses
                const errorState = errorTracker.get(providerKey) || {
                    count: 0,
                    lastRotation: 0,
                    statusCodes: new Map(),
                };
                const currentCount = errorState.statusCodes.get(response.status) || 0;
                errorState.statusCodes.set(response.status, currentCount + 2); // Increment by 2 for bad responses
                errorState.count += 2;
                errorTracker.set(providerKey, errorState);

                if (shouldRotateIP(errorState)) {
                    rotateIPWithQueue(providerKey).catch(console.error);
                }
                abortProviderRequests(providerKey);
            }
            throw new Error(`Request failed with status ${response.status}`);
        }
        return response;
    } catch (error: unknown) {
        if (error instanceof Error) {
            console.warn(`Request to ${url} failed:`, error.message);

            // If this is a provider-specific request, abort all its requests and track error
            if (providerKey) {
                // Increment error count for failed requests
                const errorState = errorTracker.get(providerKey) || {
                    count: 0,
                    lastRotation: 0,
                    statusCodes: new Map(),
                };
                const currentCount = errorState.statusCodes.get(999) || 0;
                errorState.statusCodes.set(999, currentCount + 2); // Increment by 2 for general errors
                errorState.count += 2;
                errorTracker.set(providerKey, errorState);

                if (shouldRotateIP(errorState)) {
                    rotateIPWithQueue(providerKey).catch(console.error);
                }
                abortProviderRequests(providerKey);
            }
        }
        return null;
    } finally {
        clearTimeout(timeoutId);
        if (providerKey) {
            activeControllers.delete(providerKey);
            // Clear request tracking
            rotationState.requestQueue.delete(providerKey);
            rotationState.activeRequests.set(providerKey, 0);
        }
    }
}

// Function to abort all requests for a provider
function abortProviderRequests(providerKey: string) {
    const controller = activeControllers.get(providerKey);
    if (controller) {
        controller.abort();
        activeControllers.delete(providerKey);
    }
    // Clear request tracking
    rotationState.requestQueue.delete(providerKey);
    rotationState.activeRequests.set(providerKey, 0);
}

async function acquireRequestSlot(providerKey: string): Promise<boolean> {
    const currentRequests = rotationState.activeRequests.get(providerKey) || 0;
    if (currentRequests >= rotationState.maxConcurrentRequests) {
        return false;
    }
    rotationState.activeRequests.set(providerKey, currentRequests + 1);
    return true;
}

function releaseRequestSlot(providerKey: string): void {
    const currentRequests = rotationState.activeRequests.get(providerKey) || 0;
    if (currentRequests > 0) {
        rotationState.activeRequests.set(providerKey, currentRequests - 1);
    }
}

export async function customRequest(url: string, options: IRequestConfig = {}): Promise<Response | null> {
    const { isChecking, proxy, useGoogleTranslate, timeout, providerType, providerId, maxRetries, validateResponse } = options;
    const retryAttempts = isChecking ? 1 : maxRetries || 3;
    const providerKey = `${providerType}-${providerId}`;
    const requestTimeout = timeout || 15000; // Default to 15 seconds

    // Create an abort controller for this request chain
    const controller = new AbortController();
    activeControllers.set(providerKey, controller);

    let hasAcquiredSlot = false;

    try {
        // Try different request strategies in sequence
        for (let attempt = 1; attempt <= retryAttempts; attempt++) {
            // Check if request has been aborted
            if (controller.signal.aborted) {
                console.log(`Request chain aborted for provider ${providerKey}`);
                return null;
            }

            // Wait if IP rotation is in progress
            if (rotationState.isRotating || rotationState.rotationPromise) {
                await waitForRotation(providerKey);
                // Add a small delay after rotation to ensure the new IP is ready
                await new Promise((resolve) => setTimeout(resolve, 2000));
                continue; // Retry with new IP
            }

            // Wait for a request slot with timeout
            if (!hasAcquiredSlot) {
                const slotStartTime = Date.now();
                while (!controller.signal.aborted && !(await acquireRequestSlot(providerKey))) {
                    if (Date.now() - slotStartTime > 10000) {
                        // 10 second timeout for slot acquisition
                        console.warn(`Timeout waiting for request slot for provider ${providerKey}`);
                        abortProviderRequests(providerKey);
                        return null;
                    }
                    await new Promise((resolve) => setTimeout(resolve, 100));
                }
                hasAcquiredSlot = true;
            }

            try {
                // Add providerKey and signal to options
                const requestOptions: ExtendedRequestInit = {
                    ...options,
                    providerKey,
                    signal: controller.signal,
                };

                // 1. Try WireGuard proxy first if enabled
                if (!useGoogleTranslate && !isChecking && env.USE_WIREGUARD) {
                    const errorState = errorTracker.get(providerKey) || {
                        count: 0,
                        lastRotation: 0,
                        statusCodes: new Map(),
                    };

                    if (shouldRotateIP(errorState)) {
                        await rotateIPWithQueue(providerKey);
                        continue;
                    }

                    const response = await makeRequest(url, requestOptions, requestTimeout + attempt * 5000);

                    if (response) {
                        if (!validateResponse || (await validateResponse(response.clone()))) {
                            errorTracker.set(providerKey, {
                                count: 0,
                                lastRotation: errorState.lastRotation,
                                statusCodes: new Map(),
                            });
                            return response;
                        }
                    } else {
                        if (providerType && providerId) {
                            const currentCount = errorState.statusCodes.get(999) || 0;
                            errorState.statusCodes.set(999, currentCount + 1);
                            errorState.count++;
                            errorTracker.set(providerKey, errorState);
                            // Abort remaining requests on error
                            abortProviderRequests(providerKey);
                            return null;
                        }
                    }
                }

                // 2. Try CORS proxy if WireGuard failed
                const proxyURL = isChecking ? proxy : useGoogleTranslate ? null : proxy && attempt === 1 ? proxy : providerType && providerId ? proxyToUrl(selectProxy(providerType, providerId)) : null;

                if (proxyURL) {
                    const proxiedUrl = `${proxyURL}/${url}`;
                    const response = await makeRequest(
                        proxiedUrl,
                        {
                            ...requestOptions,
                            headers: {
                                ...requestOptions.headers,
                                Origin: "https://anify.tv",
                            },
                        },
                        requestTimeout + attempt * 5000,
                    );

                    if (response && (!validateResponse || (await validateResponse(response.clone())))) {
                        return response;
                    }
                }

                // 3. Try Google Translate as last resort if enabled
                if (useGoogleTranslate) {
                    const translatedUrl = `http://translate.google.com/translate?sl=ja&tl=en&u=${encodeURIComponent(url)}`;
                    const response = await makeRequest(translatedUrl, requestOptions, requestTimeout + attempt * 5000);

                    if (response && (!validateResponse || (await validateResponse(response.clone())))) {
                        return response;
                    }
                }
            } catch (error) {
                console.warn(`Request attempt ${attempt} failed for ${url}:`, error);
                // Abort remaining requests on error
                abortProviderRequests(providerKey);
                return null;
            }
        }

        return null;
    } finally {
        if (hasAcquiredSlot) {
            releaseRequestSlot(providerKey);
        }
        activeControllers.delete(providerKey);
    }
}

// Add cleanup function
export function abortAllRequests(): void {
    for (const [providerKey, controller] of activeControllers) {
        controller.abort();
        rotationState.requestQueue.delete(providerKey);
        rotationState.activeRequests.set(providerKey, 0);
    }
    activeControllers.clear();
}
