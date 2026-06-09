// 🌸 proxies/impl/request.ts

import type { IRequestConfig } from "../../types/impl/proxies";

const CORS_ORIGIN = "https://anify.to";

function wrapWithProxy(targetUrl: string, proxyBase: string): string {
    const base = proxyBase.endsWith("/") ? proxyBase : `${proxyBase}/`;
    return `${proxyBase.startsWith("http://") ? "" : "http://"}${base}${targetUrl}`;
}

export async function customRequest(
    url: string,
    config: IRequestConfig = {}
): Promise<Response | null> {
    const {
        _proxyURL,
        timeout = 15000,
        signal,
        headers: extraHeaders = {},
        proxy,
        ...restConfig
    } = config;

    const proxyUrl = _proxyURL ?? proxy;
    const finalUrl = proxyUrl ? wrapWithProxy(url, proxyUrl) : url;

    const timeoutController = new AbortController();
    const timeoutId = setTimeout(() => timeoutController.abort(), timeout);

    const mergedSignal = signal
        ? mergeSignals(signal, timeoutController.signal)
        : timeoutController.signal;

    const headers: Record<string, string> = {
        "Origin": CORS_ORIGIN,
        "X-Requested-With": "XMLHttpRequest",
        ...(extraHeaders as Record<string, string>),
    };

    try {
        const response = await fetch(finalUrl, {
            ...restConfig,
            headers,
            signal: mergedSignal,
        });

        return response;
    } catch (err) {
        if (err instanceof Error && err.name === "AbortError") {
            return null;
        }
        console.error(`❌ Request failed [${finalUrl}]:`, err);
        return null;
    } finally {
        clearTimeout(timeoutId);
    }
}

function mergeSignals(...signals: AbortSignal[]): AbortSignal {
    const controller = new AbortController();

    for (const signal of signals) {
        if (signal.aborted) {
            controller.abort();
            break;
        }
        signal.addEventListener("abort", () => controller.abort(), { once: true });
    }

    return controller.signal;
}