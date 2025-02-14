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

const ROTATION_THRESHOLD = 5;
const ROTATION_COOLDOWN = 60000;
const STATUS_CODE_WEIGHTS: Record<number, number> = {
    503: 2.5, // Service unavailable - likely rate limit
    429: 5, // Explicit rate limit - rotate quickly
    404: 0.2, // Not found - much less important
    999: 2, // Timeout errors
};

const MIN_OCCURRENCES: Record<number, number> = {
    503: 2, // Need at least 2 service unavailable errors
    429: 1, // Single rate limit is significant
    404: 10, // Need many 404s to trigger rotation
    999: 2, // Need couple timeouts
};

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

async function makeRequest(url: string, options: RequestInit, timeout: number = 10000): Promise<Response | null> {
    try {
        const timeoutPromise = new Promise<Response>((_, reject) => {
            setTimeout(() => reject(new Error("Request timed out")), timeout);
        });

        const response = await Promise.race([fetch(url, options), timeoutPromise]);
        if (!response.ok) {
            throw new Error(`Request failed with status ${response.status}`);
        }
        return response;
    } catch {
        return null;
    }
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

    // Try different request strategies in sequence
    for (let attempt = 1; attempt <= retryAttempts; attempt++) {
        // Wait if IP rotation is in progress
        if (rotationState.isRotating || rotationState.rotationPromise) {
            await waitForRotation(providerKey);
            // Add a small delay after rotation to ensure the new IP is ready
            await new Promise((resolve) => setTimeout(resolve, 1000));
        }

        // Wait for a request slot
        while (!(await acquireRequestSlot(providerKey))) {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        try {
            // 1. Try WireGuard proxy first if enabled
            if (!useGoogleTranslate && !isChecking && env.USE_WIREGUARD) {
                const errorState = errorTracker.get(providerKey) || {
                    count: 0,
                    lastRotation: 0,
                    statusCodes: new Map(),
                };

                if (shouldRotateIP(errorState)) {
                    await rotateIPWithQueue(providerKey);
                    // Skip this attempt and try again with the new IP
                    continue;
                }

                const response = await makeRequest(
                    url,
                    {
                        ...options,
                        headers: { ...options.headers },
                    },
                    timeout || 10000,
                );

                if (response) {
                    if (!validateResponse || (await validateResponse(response.clone()))) {
                        // Reset error tracking on success
                        errorTracker.set(providerKey, {
                            count: 0,
                            lastRotation: errorState.lastRotation,
                            statusCodes: new Map(),
                        });

                        return response;
                    }
                } else {
                    // Update error tracking
                    if (providerType && providerId) {
                        const currentCount = errorState.statusCodes.get(999) || 0;
                        errorState.statusCodes.set(999, currentCount + 1);
                        errorState.count++;
                        errorTracker.set(providerKey, errorState);
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
                        ...options,
                        headers: {
                            ...options.headers,
                            Origin: "https://anify.tv",
                        },
                    },
                    timeout || 5000,
                );

                if (response && (!validateResponse || (await validateResponse(response.clone())))) {
                    return response;
                }
            }

            // 3. Try Google Translate as last resort if enabled
            if (useGoogleTranslate) {
                const translatedUrl = `http://translate.google.com/translate?sl=ja&tl=en&u=${encodeURIComponent(url)}`;
                const response = await makeRequest(translatedUrl, options, timeout || 5000);

                if (response && (!validateResponse || (await validateResponse(response.clone())))) {
                    return response;
                }
            }
        } finally {
            releaseRequestSlot(providerKey);
        }
    }

    // If all strategies failed, update error tracking and return null
    if (providerType && providerId) {
        const errorState = errorTracker.get(providerKey) || {
            count: 0,
            lastRotation: 0,
            statusCodes: new Map(),
        };

        // Add to error count and track as a 503 error (service unavailable)
        const currentCount = errorState.statusCodes.get(503) || 0;
        errorState.statusCodes.set(503, currentCount + 1);
        errorState.count++;
        errorTracker.set(providerKey, errorState);

        console.warn(`All request strategies failed for ${url}. Provider: ${providerId}/${providerType}`);
    }

    return null;
}
