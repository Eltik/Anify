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
     */
    async request(url: string, config: IRequestConfig = {}, proxyRequest: boolean = false): Promise<Response> {
        if (!MediaProvider.limiterMap.has(this.id)) {
            // e.g. minTime = this.rateLimit, so 1 request per 'rateLimit' ms
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

        return limiter.schedule(async () => {
            // Get the best proxy based on health metrics
            const selectedProxy = selectProxy(this.providerType, this.id);
            const proxyURL = proxyToUrl(selectedProxy);
            const useProxy = (config.proxy && config.proxy.length > 0) || proxyRequest || this.needsProxy;

            // Ensure isChecking is properly set
            const finalConfig: IRequestConfig = {
                ...config,
                // Don't set proxy immediately to allow CloudFlare workers to be tried first
                providerId: this.id,
                providerType: this.providerType,
                isChecking: this.isCheckingProxies || config.isChecking,
                useGoogleTranslate: this.useGoogleTranslate,
                useCloudflareWorker: config.useCloudflareWorker === false ? false : true,
                // Store proxy info for fallback
                _proxyURL: useProxy ? (this.useGoogleTranslate ? undefined : config.proxy && config.proxy.length > 0 ? config.proxy : (proxyURL ?? undefined)) : undefined,
            };

            return customRequest(url, finalConfig);
        });
    }
}
