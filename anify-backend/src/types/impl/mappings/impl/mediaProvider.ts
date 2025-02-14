import Bottleneck from "bottleneck";
import { ProviderType } from "../../..";
import type { IRequestConfig } from "../../proxies";
import { selectProxy, proxyToUrl } from "../../../../proxies/impl/manager";
import { customRequest } from "../../../../proxies/impl/request/customRequest";

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

    abstract providerType: ProviderType;
    abstract id: string;
    abstract rateLimit: number;
    abstract maxConcurrentRequests: number;

    public needsProxy: boolean = false;
    public useGoogleTranslate: boolean = true;
    public isCheckingProxies: boolean = false;

    abstract proxyCheck(proxyUrl: string): Promise<boolean | undefined>;

    /**
     * Queued request function that respects this.rateLimit (seconds/10).
     * Returns Response if successful, throws RequestError for handled failures.
     * Throws other errors only for unexpected failures that should halt execution.
     */
    async request(url: string, config: IRequestConfig = {}, proxyRequest: boolean = false): Promise<Response> {
        if (!MediaProvider.limiterMap.has(this.id)) {
            const bottleneck = new Bottleneck({
                minTime: this.rateLimit,
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
                // Get the best proxy based on health metrics
                const selectedProxy = selectProxy(this.providerType, this.id);
                const proxyURL = proxyToUrl(selectedProxy);
                const useProxy = (config.proxy && config.proxy.length > 0) || proxyRequest || this.needsProxy;

                const finalConfig: IRequestConfig = {
                    ...config,
                    providerId: this.id,
                    providerType: this.providerType,
                    isChecking: this.isCheckingProxies || config.isChecking,
                    useGoogleTranslate: this.useGoogleTranslate,
                    // Store proxy info for fallback
                    _proxyURL: useProxy ? (this.useGoogleTranslate ? undefined : config.proxy && config.proxy.length > 0 ? config.proxy : (proxyURL ?? undefined)) : undefined,
                };

                const result = await customRequest(url, finalConfig);
                if (!result) {
                    throw new RequestError(`Request failed after all retry attempts`, url, this.id, this.providerType);
                }
                return result;
            });

            return response;
        } catch (error) {
            if (error instanceof RequestError) {
                // Log the handled error but don't halt execution
                console.warn(`Request failed for ${url} (${this.id}/${this.providerType}):`, error.message);

                // Return an empty 204 response instead of null
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

            // For unexpected errors, throw a standardized error
            console.error(`Unexpected error in request for ${url} (${this.id}/${this.providerType}):`, error);
            throw new RequestError(`Failed to fetch ${url}`, url, this.id, this.providerType);
        }
    }
}
