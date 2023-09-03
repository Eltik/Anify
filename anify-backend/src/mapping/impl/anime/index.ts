import { Format, ProviderType, type Result } from "../..";
import Http from "../request";

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

export const enum SubType {
    DUB = "dub",
    SUB = "sub",
}

export const enum StreamingServers {
    AsianLoad = "asianload",
    GogoCDN = "gogocdn",
    StreamSB = "streamsb",
    MixDrop = "mixdrop",
    UpCloud = "upcloud",
    VidCloud = "vidcloud",
    StreamTape = "streamtape",
    VizCloud = "vizcloud",
    MyCloud = "mycloud",
    Filemoon = "filemoon",
    VidStreaming = "vidstreaming",
    AllAnime = "allanime",
    FPlayer = "fplayer",
    Kwik = "kwik",
    DuckStream = "duckstream",
    DuckStreamV2 = "duckstreamv2",
    BirdStream = "birdstream",
    AnimeFlix = "animeflix",
}

export type Episode = {
    id: string;
    title: string;
    number: number;
    isFiller: boolean;
    img: string | null;
    hasDub: boolean;
    updatedAt?: number;
};

export type Source = {
    sources: { url: string; quality: string }[];
    subtitles: { url: string; lang: string; label: string }[];
    audio: { url: string; name: string; language: string }[];
    intro: {
        start: number;
        end: number;
    };
    outro: {
        start: number;
        end: number;
    };
    headers: Record<string, string>;
};

export type Server = {
    name: string;
    url: string;
    type?: SubType;
};
