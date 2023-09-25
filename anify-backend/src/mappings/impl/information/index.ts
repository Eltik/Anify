import Http from "../../../helper/request";
import { Format, ProviderType, Type } from "../../../types/enums";
import { Anime, AnimeInfo, Chapter, Episode, Manga, MangaInfo, MediaInfoKeys } from "../../../types/types";

export default abstract class InformationProvider<T extends Anime | Manga, U extends AnimeInfo | MangaInfo> {
    abstract id: string;
    abstract url: string;

    public providerType: ProviderType = ProviderType.INFORMATION;
    public customProxy: string | undefined;
    public preferredTitle: "english" | "romaji" | "native" = "english";

    async info(media: T): Promise<U | undefined> {
        return undefined;
    }

    async fetchContentData(media: T): Promise<Episode[] | Chapter[] | undefined> {
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
