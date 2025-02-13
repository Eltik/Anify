import Bottleneck from "bottleneck";
import { ProviderType } from "../../..";
import type { IRequestConfig } from "../../proxies";
import { selectProxy, proxyToUrl } from "../../../../proxies/impl/manager";
import { customRequest } from "../../../../proxies/impl/request/customRequest";

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
     * Returns Response if successful, null if request failed but was handled gracefully.
     * Throws an error only for unexpected failures that should halt execution.
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
                    throw new Error(`Request failed for ${url}`);
                }
                return result;
            });

            return response;
        } catch (error) {
            // Log the error but throw a standardized error to maintain type safety
            console.error(`Error in request for ${url} (${this.id}/${this.providerType}):`, error);
            throw new Error(`Failed to fetch ${url}`);
        }
    }
}
