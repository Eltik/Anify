import type { IRequestConfig } from "../../../../types/impl/proxies";
import { proxyToUrl, selectProxy } from "../../manager";

const MAX_PARALLEL_RETRIES = 3;

const isJsonParseError = (error: unknown): boolean => {
    return error instanceof SyntaxError && error.message.includes("Unexpected end of JSON input");
};

const isCORS = (options: IRequestConfig = {}, attempt?: number): boolean => {
    const { isChecking, proxy, useGoogleTranslate, providerType, providerId } = options;

    const proxyURL = isChecking ? proxy : useGoogleTranslate ? null : proxy && attempt === 1 ? proxy : providerType && providerId ? proxyToUrl(selectProxy(providerType, providerId)) : null;
    if (proxyURL) {
        return true;
    }

    return false;
};

const attemptRequest = async (url: string, options: IRequestConfig = {}, attempt: number): Promise<Response | null> => {
    try {
        const corsResponse = await cors(url, options, attempt);
        if (options.signal?.aborted) return null;

        if (corsResponse) {
            // Try to validate JSON if there's a validateResponse function
            if (options.validateResponse) {
                try {
                    const clonedResponse = corsResponse.clone();
                    await options.validateResponse(clonedResponse);
                    return corsResponse;
                } catch (error) {
                    if (!isJsonParseError(error)) {
                        return corsResponse;
                    }
                    // If JSON parsing fails, return null to trigger retry
                    return null;
                }
            }
            return corsResponse;
        }
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            return null;
        }
        console.error(`CORS attempt ${attempt} failed:`, error);
    }
    return null;
};

const corsWithRetries = async (url: string, options: IRequestConfig = {}): Promise<Response | null> => {
    // Try parallel CORS requests
    const corsPromises = Array.from({ length: MAX_PARALLEL_RETRIES }, (_, i) => attemptRequest(url, options, i + 1));

    const responses = await Promise.all(corsPromises);
    return responses.find((response) => response !== null) ?? null;
};

const cors = async (url: string, options: IRequestConfig = {}, attempt?: number): Promise<Response | null> => {
    const { isChecking, proxy, useGoogleTranslate, providerType, providerId, validateResponse } = options;

    const proxyURL = isChecking ? proxy : useGoogleTranslate ? null : proxy && attempt === 1 ? proxy : providerType && providerId ? proxyToUrl(selectProxy(providerType, providerId)) : null;

    if (proxyURL) {
        const proxiedURL = `${proxyURL}/${url}`;
        const response = await fetch(proxiedURL, {
            ...options,
            headers: {
                ...options.headers,
                Origin: "https://anify.tv",
            },
        });

        if (response && (!validateResponse || (await validateResponse(response.clone())))) {
            return response;
        }
    }

    return null;
};

export default {
    cors,
    corsWithRetries,
    isCORS,
};
