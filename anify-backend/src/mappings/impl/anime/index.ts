import Http from "../../../helper/request";
import { Format, ProviderType, StreamingServers, SubType } from "../../../types/enums";
import { Anime, Episode, Result, Server, Source } from "../../../types/types";

export default abstract class AnimeProvider {
    abstract rateLimit: number;
    abstract id: string;
    abstract url: string;
    abstract formats: Format[];

    public providerType: ProviderType = ProviderType.ANIME;
    public customProxy: string | undefined;
    public preferredTitle: "english" | "romaji" | "native" = "english";

    public needsProxy: boolean = false;
    public useGoogleTranslate: boolean = true;
    public overrideProxy: boolean = false;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        return undefined;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async fetchEpisodes(id: string): Promise<Episode[] | undefined> {
        return undefined;
    }

    async fetchRecent(): Promise<Anime[] | undefined> {
        return undefined;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async fetchSources(id: string, subType: SubType = SubType.SUB, server: StreamingServers): Promise<Source | undefined> {
        return undefined;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async fetchServers(id: string, subType: SubType = SubType.SUB): Promise<Server[] | undefined> {
        return undefined;
    }

    async request(url: string, config: RequestInit = {}, proxyRequest?: boolean): Promise<Response> {
        if (proxyRequest === undefined && this.needsProxy) proxyRequest = true;
        if (proxyRequest !== undefined && proxyRequest === false && this.needsProxy) proxyRequest = false;
        if (proxyRequest === undefined && !this.needsProxy) proxyRequest = false;
        if (proxyRequest !== undefined && proxyRequest === true && !this.needsProxy) proxyRequest = true;

        return Http.request(this.id, this.useGoogleTranslate, url, config, proxyRequest, 0, this.customProxy);
    }

    abstract get subTypes(): SubType[];
    abstract get headers(): Record<string, string> | undefined;
}
