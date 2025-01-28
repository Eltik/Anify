import Bottleneck from "bottleneck";
import { ProviderType } from "../../..";
import type { IRequestConfig } from "../../proxies";
import { getRandomProxy } from "../../../../proxies/impl/manager/impl/getRandomProxy";
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
            // same proxy logic
            const proxy = getRandomProxy(this.providerType, this.id);
            const useProxy = (config.proxy && config.proxy.length > 0) || proxyRequest || this.needsProxy;

            // Ensure isChecking is properly set
            const finalConfig: IRequestConfig = {
                ...config,
                proxy: useProxy ? (this.useGoogleTranslate ? undefined : config.proxy && config.proxy.length > 0 ? config.proxy : (proxy ?? undefined)) : undefined,
                useGoogleTranslate: this.useGoogleTranslate,
                providerId: this.id,
                providerType: this.providerType,
                isChecking: this.isCheckingProxies || config.isChecking,
            };

            return customRequest(url, finalConfig);
        });
    }
}
