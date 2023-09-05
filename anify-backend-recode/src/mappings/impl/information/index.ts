import Http from "../../../helper/request";
import { Format, ProviderType, Type } from "../../../types/enums";
import { Anime, Manga } from "../../../types/types";

export default abstract class InformationProvider<T extends Anime | Manga, U extends AnimeInfo | MangaInfo> {
    abstract id: string;
    abstract url: string;

    public providerType: ProviderType = ProviderType.INFORMATION;
    public customProxy: string | undefined;

    async search(query: string, type: Type, formats: Format[]): Promise<U[] | undefined> {
        return [];
    }

    async info(media: T): Promise<U | undefined> {
        return undefined;
    }

    get priorityArea(): MediaInfoKeys[] {
        return [];
    }

    get sharedArea(): MediaInfoKeys[] {
        return [];
    }

    async request(url: string, config: RequestInit = {}, proxyRequest = true): Promise<Response> {
        return Http.request(url, config, proxyRequest, 0, this.customProxy);
    }
}

export type AnimeInfo = Pick<Anime, "title" | "artwork" | "synonyms" | "totalEpisodes" | "currentEpisode" | "bannerImage" | "coverImage" | "color" | "season" | "year" | "status" | "genres" | "description" | "format" | "duration" | "trailer" | "countryOfOrigin" | "tags" | "relations" | "characters"> & {
    rating: number | null;
    popularity: number | null;
};

export type MangaInfo = Pick<Manga, "title" | "artwork" | "synonyms" | "totalChapters" | "bannerImage" | "coverImage" | "color" | "year" | "status" | "genres" | "description" | "format" | "totalVolumes" | "countryOfOrigin" | "tags" | "relations" | "characters"> & {
    rating: number | null;
    popularity: number | null;
};

type SharedKeys<T, U> = {
    [K in keyof T]: K extends keyof U ? K : never;
}[keyof T];

export type MediaInfoKeys = SharedKeys<AnimeInfo, MangaInfo>;
