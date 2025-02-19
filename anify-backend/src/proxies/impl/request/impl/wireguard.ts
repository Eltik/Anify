import { env } from "../../../../env";
import type { IRequestConfig } from "../../../../types/impl/proxies";
import { ProxyManager } from "../../wireguard/impl/proxy-manager";

let proxyManager: ProxyManager | null = null;
let isRotating = false;
let failureCount = 0;
const FAILURE_THRESHOLD = 5;

const isWireguard = (options: IRequestConfig = {}): boolean => {
    return !options.useGoogleTranslate && !options.isChecking && env.USE_WIREGUARD;
};

const wireguard = async (url: string, options: IRequestConfig = {}): Promise<Response | null> => {
    const { validateResponse, signal } = options;

    try {
        // Initialize proxy manager if not already initialized
        if (!proxyManager) {
            proxyManager = new ProxyManager();
            await proxyManager.init();
        }

        // Attempt the request with the abort signal
        const response = await fetch(url, { ...options, signal });

        // If request was aborted, don't proceed with validation
        if (signal?.aborted) {
            return null;
        }

        if (response && (!validateResponse || (await validateResponse(response.clone())))) {
            // Reset failure count on success
            failureCount = 0;
            return response;
        }

        // Increment failure count
        failureCount++;

        // If we've hit the threshold and we're not currently rotating, rotate the IP
        if (failureCount >= FAILURE_THRESHOLD && !isRotating && proxyManager) {
            isRotating = true;
            try {
                await proxyManager.rotate();
                // Check if aborted before retry
                if (signal?.aborted) {
                    return null;
                }
                // Retry the request after rotation with the abort signal
                const retryResponse = await fetch(url, { ...options, signal });
                if (retryResponse && (!validateResponse || (await validateResponse(retryResponse.clone())))) {
                    failureCount = 0;
                    return retryResponse;
                }
            } finally {
                isRotating = false;
            }
        }
    } catch (error) {
        // Don't log or increment failure count if the request was intentionally aborted
        if (error instanceof Error && error.name === "AbortError") {
            return null;
        }
        console.error("Error in wireguard request:", error);
        failureCount++;
    }

    return null;
};

export default {
    isWireguard,
    wireguard,
};
