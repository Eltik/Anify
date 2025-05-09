import type { IRequestConfig } from "../../../types/impl/proxies";
import cors from "./impl/cors";
import googleTranslate from "./impl/googleTranslate";

export const customRequest = async (url: string, options: IRequestConfig = {}) => {
    // First attempt: Try CORS proxy or Google Translate based on options
    if (cors.isCORS(options)) {
        const corsResponse = await cors.corsWithRetries(url, options);
        if (corsResponse) return corsResponse;
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
