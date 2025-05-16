import type { IRequestConfig } from "../../../../types/impl/proxies";
import { proxyToUrl, selectProxy } from "../../manager";
import { ProxyAgent } from "undici";

const MAX_PARALLEL_RETRIES = 3;

const isJsonParseError = (error: unknown): boolean => {
    return error instanceof SyntaxError && error.message.includes("Unexpected end of JSON input");
};

const isProxy = (options: IRequestConfig = {}, attempt?: number): boolean => {
    const { isChecking, proxy, useGoogleTranslate, providerType, providerId } = options;

    const proxyURL = isChecking ? proxy : useGoogleTranslate ? null : proxy && attempt === 1 ? proxy : providerType && providerId ? proxyToUrl(selectProxy(providerType, providerId)) : null;
    if (proxyURL) {
        return true;
    }

    return false;
};

const attemptRequest = async (url: string, options: IRequestConfig = {}, attempt: number): Promise<Response | null> => {
    try {
        const proxyResponse = await proxy(url, options, attempt);
        if (options.signal?.aborted) return null;

        if (proxyResponse) {
            // Try to validate JSON if there's a validateResponse function
            if (options.validateResponse) {
                try {
                    const clonedResponse = proxyResponse.clone();
                    await options.validateResponse(clonedResponse as Response);
                    return proxyResponse;
                } catch (error) {
                    if (!isJsonParseError(error)) {
                        return proxyResponse;
                    }
                    // If JSON parsing fails, return null to trigger retry
                    return null;
                }
            }
            return proxyResponse;
        }
    } catch (error) {
        if (error instanceof Error && error.name === "AbortError") {
            return null;
        }
        console.error(`Proxy attempt ${attempt} failed:`, error);
    }
    return null;
};

const proxyWithRetries = async (url: string, options: IRequestConfig = {}): Promise<Response | null> => {
    // Try parallel CORS requests
    const proxyPromises = Array.from({ length: MAX_PARALLEL_RETRIES }, (_, i) => attemptRequest(url, options, i + 1));

    const responses = await Promise.all(proxyPromises);
    return responses.find((response) => response !== null) ?? null;
};

const proxy = async (url: string, options: IRequestConfig = {}, attempt?: number): Promise<Response | null> => {
    const { isChecking, proxy, useGoogleTranslate, providerType, providerId, validateResponse } = options;

    const proxyURL = isChecking ? proxy : useGoogleTranslate ? null : proxy && attempt === 1 ? proxy : providerType && providerId ? proxyToUrl(selectProxy(providerType, providerId)) : null;

    if (proxyURL) {
        const requestOptions = {
            ...options,
            signal: options.signal,
        } as RequestInit;

        const proxyAgent = new ProxyAgent(proxyURL);
        Object.assign(requestOptions, {
            dispatcher: proxyAgent
        });

        const response = await fetch(url, requestOptions);

        if (response && (!validateResponse || (await validateResponse(response.clone() as Response)))) {
            return response;
        }
    }

    return null;
};

export default {
    proxy,
    proxyWithRetries,
    isProxy,
};
