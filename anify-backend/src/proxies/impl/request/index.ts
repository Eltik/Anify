import type { IRequestConfig } from "../../../types/impl/proxies";
import proxy from "./impl/proxy";
import googleTranslate from "./impl/googleTranslate";

export const customRequest = async (url: string, options: IRequestConfig = {}) => {
    // First attempt: Try CORS proxy or Google Translate based on options
    if (proxy.isProxy(options)) {
        const proxyResponse = await proxy.proxyWithRetries(url, options);
        if (proxyResponse) return proxyResponse;
    } else if (googleTranslate.isGoogleTranslate(options)) {
        const translateResponse = await googleTranslate.googleTranslate(url, options);
        if (options.signal?.aborted) return null;
        if (translateResponse) return translateResponse;
    }

    // Second attempt: Try normal request with AbortSignal
    if (options.signal) {
        const response = await fetch(url, { ...options, signal: options.signal });
        if (response) return response;
    } else {
        const response = await fetch(url, options);
        if (response) return response;
    }

    // If all attempts fail, return null
    return null;
};
