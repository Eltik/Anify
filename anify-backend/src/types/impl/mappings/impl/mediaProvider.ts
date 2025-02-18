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
    private controller: AbortController | null = null;

    abstract providerType: ProviderType;
    abstract id: string;
    abstract rateLimit: number;
    abstract maxConcurrentRequests: number;

    public needsProxy: boolean = false;
    public useGoogleTranslate: boolean = true;
    public isCheckingProxies: boolean = false;

    abstract proxyCheck(proxyUrl: string): Promise<boolean | undefined>;

    // Add method to abort all pending requests for this provider
    public abortRequests(): void {
        if (this.controller) {
            this.controller.abort();
            this.controller = null;
        }
    }

    /**
     * Queued request function that respects this.rateLimit (seconds/10).
     * Returns Response if successful, throws RequestError for handled failures.
     * Throws other errors only for unexpected failures that should halt execution.
     */
    async request(url: string, config: IRequestConfig = {}, proxyRequest: boolean = false): Promise<Response> {
        // Create a new controller for this request chain
        this.controller = new AbortController();

        if (!MediaProvider.limiterMap.has(this.id)) {
            const bottleneck = new Bottleneck({
                minTime: this.rateLimit,
                reservoir: 10, // Add a reservoir to prevent too many requests
                reservoirRefreshAmount: 10,
                reservoirRefreshInterval: this.rateLimit * 1000, // Refresh interval in ms
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
                // Check if request has been aborted
                if (this.controller?.signal.aborted) {
                    throw new RequestError("Request aborted", url, this.id, this.providerType);
                }

                const selectedProxy = selectProxy(this.providerType, this.id);
                const proxyURL = proxyToUrl(selectedProxy);
                const useProxy = (config.proxy && config.proxy.length > 0) || proxyRequest || this.needsProxy;

                const finalConfig: IRequestConfig = {
                    ...config,
                    providerId: this.id,
                    providerType: this.providerType,
                    isChecking: this.isCheckingProxies || config.isChecking,
                    useGoogleTranslate: this.useGoogleTranslate,
                    signal: this.controller?.signal,
                    timeout: config.timeout || 15000, // Ensure timeout is set
                    _proxyURL: useProxy ? (this.useGoogleTranslate ? undefined : config.proxy && config.proxy.length > 0 ? config.proxy : (proxyURL ?? undefined)) : undefined,
                };

                const result = await customRequest(url, finalConfig);
                if (!result) {
                    this.abortRequests(); // Abort on failure
                    throw new RequestError("Request failed after all retry attempts", url, this.id, this.providerType);
                }
                return result;
            });

            return response;
        } catch (error) {
            if (error instanceof RequestError) {
                // Abort any remaining requests
                this.abortRequests();

                // Return an empty 204 response
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
