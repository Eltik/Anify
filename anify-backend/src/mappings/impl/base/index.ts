import Http from "../../../helper/request";
import { Format, Genres, ProviderType, Season, Type } from "../../../types/enums";
import { Anime, AnimeInfo, MangaInfo } from "../../../types/types";

export default abstract class BaseProvider {
    abstract id: string;
    abstract url: string;

    abstract formats: Format[];

    public providerType: ProviderType = ProviderType.BASE;
    public customProxy: string | undefined;
    public needsProxy: boolean = false;

    async search(query: string, type: Type, formats: Format[], page: number, perPage: number): Promise<AnimeInfo[] | MangaInfo[] | undefined> {
        return undefined;
    }

    async searchAdvanced(query: string, type: Type, formats: Format[], page: number, perPage: number, genres: Genres[] = [], genresExcluded: Genres[] = [], year = 0, tags: string[] = [], tagsExcluded: string[] = []): Promise<AnimeInfo[] | MangaInfo[] | undefined> {
        return undefined;
    }

    getCurrentSeason(): Season {
        return Season.SUMMER;
    }

    async getMedia(id: string): Promise<AnimeInfo | MangaInfo | undefined> {
        return undefined;
    }

    async fetchSeasonal(type: Type, formats: Format[]): Promise<{ trending: AnimeInfo[] | MangaInfo[]; seasonal: AnimeInfo[] | MangaInfo[]; popular: AnimeInfo[] | MangaInfo[]; top: AnimeInfo[] | MangaInfo[] } | undefined> {
        return undefined;
    }

    async fetchIds(formats: Format[]): Promise<string[] | undefined> {
        return undefined;
    }

    async request(url: string, config: RequestInit = {}, proxyRequest?: boolean): Promise<Response> {
        if (proxyRequest === undefined && this.needsProxy) proxyRequest = true;
        if (proxyRequest !== undefined && proxyRequest === false && this.needsProxy) proxyRequest = false;
        if (proxyRequest === undefined && !this.needsProxy) proxyRequest = false;
        if (proxyRequest !== undefined && proxyRequest === true && !this.needsProxy) proxyRequest = true;

        return Http.request("BASE", url, config, proxyRequest, 0, this.customProxy);
    }
}
