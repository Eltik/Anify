import fs from "fs";
import path from "path";
import Bottleneck from "bottleneck";
import { ProviderType } from "../../..";
import type { IRequestConfig } from "../../proxies";
import { customRequest } from "../../../../proxies/impl/request";

interface Proxy {
    ip: string;
    port: number;
}

// 🌸 Load proxies once at startup, round-robin per provider
const ALL_PROXIES: Proxy[] = (() => {
    try {
        const raw = fs.readFileSync(path.resolve(process.cwd(), "proxies.json"), "utf-8");
        return JSON.parse(raw) as Proxy[];
    } catch {
        return [];
    }
})();

const roundRobinIndex: Map<string, number> = new Map();

function pickProxy(providerId: string): string | undefined {
    if (ALL_PROXIES.length === 0) return undefined;
    const current = roundRobinIndex.get(providerId) ?? 0;
    const proxy = ALL_PROXIES[current % ALL_PROXIES.length];
    roundRobinIndex.set(providerId, current + 1);
    return proxy ? `${proxy.ip}:${proxy.port}` : undefined;
}

export class RequestError extends Error {
    constructor(
        message: string,
        public readonly url: string,
        public readonly providerId: string,
        public readonly providerType: string,
        public readonly statusCode?: number,
    ) {
        super(message);
        this.name = "RequestError";
    }
}

export abstract class MediaProvider {
    private static limiterMap: Map<string, Bottleneck> = new Map();
    private controller: AbortController | null = null;

    abstract providerType: ProviderType;
    abstract id: string;
    abstract rateLimit: number;
    abstract maxConcurrentRequests: number;

    public needsProxy: boolean = false;
    public useGoogleTranslate: boolean = true;
    public isCheckingProxies: boolean = false;

    abstract proxyCheck(proxyUrl: string): Promise<boolean | undefined>;

    public abortRequests(): void {
        if (this.controller) {
            this.controller.abort();
            this.controller = null;
        }
    }

    async request(url: string, config: IRequestConfig = {}, proxyRequest: boolean = false): Promise<Response> {
        this.controller = new AbortController();

        if (!MediaProvider.limiterMap.has(this.id)) {
            const bottleneck = new Bottleneck({
                minTime: this.rateLimit,
                reservoir: 10,
                reservoirRefreshAmount: 10,
                reservoirRefreshInterval: this.rateLimit * 1000,
            });

            if (this.maxConcurrentRequests > 0) {
                bottleneck.updateSettings({
                    maxConcurrent: this.maxConcurrentRequests,
                });
            }

            MediaProvider.limiterMap.set(this.id, bottleneck);
        }

        const limiter = MediaProvider.limiterMap.get(this.id)!;

        try {
            const response = await limiter.schedule(async () => {
                if (this.controller?.signal.aborted) {
                    throw new RequestError("Request aborted", url, this.id, this.providerType);
                }

                const useProxy = (config.proxy && config.proxy.length > 0) || proxyRequest || this.needsProxy;

                const resolvedProxy = useProxy && !this.useGoogleTranslate ? (config.proxy && config.proxy.length > 0 ? config.proxy : pickProxy(this.id)) : undefined;

                const finalConfig: IRequestConfig = {
                    ...config,
                    providerId: this.id,
                    providerType: this.providerType,
                    isChecking: this.isCheckingProxies || config.isChecking,
                    useGoogleTranslate: this.useGoogleTranslate,
                    signal: this.controller?.signal,
                    timeout: config.timeout ?? 15000,
                    _proxyURL: resolvedProxy,
                };

                const result = await customRequest(url, finalConfig);
                if (!result) {
                    this.abortRequests();
                    throw new RequestError("Request failed after all retry attempts", url, this.id, this.providerType);
                }
                return result;
            });

            return response;
        } catch (error) {
            if (error instanceof RequestError) {
                this.abortRequests();

                return new Response(null, {
                    status: 204,
                    statusText: "No Content - Request Failed",
                    headers: {
                        "X-Error-Type": "RequestError",
                        "X-Error-Message": error.message,
                        "X-Provider-Id": this.id,
                        "X-Provider-Type": this.providerType,
                    },
                });
            }

            console.error(`Unexpected error in request for ${url} (${this.id}/${this.providerType}):`, error);
            this.abortRequests();
            throw new RequestError(`Failed to fetch ${url}`, url, this.id, this.providerType);
        } finally {
            this.controller = null;
        }
    }
}
