import Http from "../../../helper/request";
import { Format, ProviderType } from "../../../types/enums";
import { Result } from "../../../types/types";

export default abstract class MetaProvider {
    abstract rateLimit: number;
    abstract id: string;
    abstract url: string;
    abstract formats: Format[];

    public providerType: ProviderType = ProviderType.META;
    public customProxy: string | undefined;
    public needsProxy: boolean = false;

    public preferredTitle: "english" | "romaji" | "native" = "english";

    async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        return undefined;
    }

    async request(url: string, config: RequestInit = {}, proxyRequest?: boolean): Promise<Response> {
        if (proxyRequest === undefined && this.needsProxy) proxyRequest = true;
        if (proxyRequest !== undefined && proxyRequest === false && this.needsProxy) proxyRequest = false;
        if (proxyRequest === undefined && !this.needsProxy) proxyRequest = false;
        if (proxyRequest !== undefined && proxyRequest === true && !this.needsProxy) proxyRequest = true;

        return Http.request("META", url, config, proxyRequest, 0, this.customProxy);
    }
}
