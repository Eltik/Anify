import Http from "../../../helper/request";
import { Format, ProviderType, Type } from "../../../types/enums";
import { Anime, AnimeInfo, Manga, MangaInfo, MediaInfoKeys } from "../../../types/types";

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
