import type { INovelExtractor } from "..";
import { type IChapter, ProviderType } from "../../..";
import { selectProxy, proxyToUrl } from "../../../../proxies/impl/manager";
import { customRequest } from "../../../../proxies/impl/request/customRequest";
import type { IPage, NovelProviders } from "../../mappings/impl/manga";
import type { IRequestConfig } from "../../proxies";
import type { Response } from "node-fetch";

export default abstract class BaseNovelExtractor implements INovelExtractor {
    abstract url: string;

    protected server: NovelProviders | undefined;

    public needsProxy: boolean = false;

    abstract extract(url: string, chapter: IChapter | null, ...args: any): Promise<IPage[] | string | undefined>;

    async request(url: string, config: IRequestConfig = {}, proxyRequest: boolean = false): Promise<Response> {
        return (async () => {
            // Get the best proxy based on health metrics
            const selectedProxy = selectProxy(ProviderType.MANGA, "novelupdates");
            const proxyUrl = proxyToUrl(selectedProxy);
            const useProxy = (config.proxy && config.proxy.length > 0) || proxyRequest || true;

            return customRequest(url, {
                proxy: useProxy ? (config.proxy && config.proxy.length > 0 ? config.proxy : (proxyUrl ?? undefined)) : undefined,
                useGoogleTranslate: false,
                providerId: "novelupdates",
                providerType: ProviderType.MANGA,
                isChecking: false,
                ...config,
            });
        })();
    }
}
