import Http from "../../../helper/request";
import { Format, ProviderType, StreamingServers, SubType } from "../../../types/enums";
import { Episode, Result, Server, Source } from "../../../types/types";

export default abstract class AnimeProvider {
    abstract rateLimit: number;
    abstract id: string;
    abstract url: string;
    abstract formats: Format[];

    public providerType: ProviderType = ProviderType.ANIME;
    public customProxy: string | undefined;

    async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        return undefined;
    }

    async fetchEpisodes(id: string): Promise<Episode[] | undefined> {
        return undefined;
    }

    async fetchSources(id: string, subType: SubType = SubType.SUB, server: StreamingServers): Promise<Source | undefined> {
        return undefined;
    }

    async fetchServers(id: string): Promise<Server[] | undefined> {
        return undefined;
    }

    async request(url: string, config: RequestInit = {}, proxyRequest = false): Promise<Response> {
        return Http.request(url, config, proxyRequest, 0, this.customProxy);
    }

    abstract get subTypes(): SubType[];
    abstract get headers(): Record<string, string> | undefined;
}
