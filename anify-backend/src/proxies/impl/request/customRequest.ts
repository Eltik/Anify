import type { IRequestConfig } from "../../../types/impl/proxies";
import { ProxyAgent } from "undici";
import { removeProviderProxy } from "../manager/impl/file/saveProviderProxies";
import { getRandomProxy } from "../manager/impl/getRandomProxy";

export async function customRequest(url: string, options: IRequestConfig = {}): Promise<Response> {
    const { isChecking, proxy, useGoogleTranslate, timeout, providerType, providerId, maxRetries } = options;

    let attempts = 0;
    while (attempts < (isChecking ? 1 : maxRetries || 3)) {
        attempts++;

        const proxyURL = isChecking ? proxy : useGoogleTranslate ? "http://translate.google.com/translate?sl=ja&tl=en&u=" + encodeURIComponent(url) : proxy && attempts === 1 ? proxy : providerType && providerId ? await getRandomProxy(providerType, providerId) : null;

        try {
            const dispatcher = new ProxyAgent(proxyURL || "");

            const fetchOptions: RequestInit = {
                ...options,
                dispatcher: dispatcher as any, // TODO: Fix this
            };

            const timeoutPromise = new Promise<Response>((_, reject) => {
                setTimeout(() => reject(new Error("Request timed out")), timeout || 5000);
            });

            const fetchPromise = fetch(url, fetchOptions);
            const response = await Promise.race([fetchPromise, timeoutPromise]);

            return response;
        } catch (error) {
            const checkError = error instanceof Error && (error.message.includes("Request timed out") || error.message.includes("socket connection was closed") || error.message.includes("unable to verify the first certificate") || error.message.includes("certificate has expired"));

            if (!isChecking && providerType && providerId && proxyURL && checkError) {
                if (!useGoogleTranslate) {
                    await removeProviderProxy(providerType, providerId, proxyURL);
                }
            } else {
                console.log((error as Error).message);
            }
        }
    }
    throw new Error("Max retry attempts reached");
}
