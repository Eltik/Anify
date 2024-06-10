import Http from "../../../helper/request";
import { ProviderType } from "../../../types/enums";
import { Anime, AnimeInfo, Chapter, Episode, Manga, MangaInfo, MediaInfoKeys } from "../../../types/types";

export default abstract class InformationProvider<T extends Anime | Manga, U extends AnimeInfo | MangaInfo> {
    abstract id: string;
    abstract url: string;

    public providerType: ProviderType = ProviderType.INFORMATION;
    public preferredTitle: "english" | "romaji" | "native" = "english";

    public customProxy: string | undefined;
    public needsProxy: boolean = false;
    public useGoogleTranslate: boolean = true;
    public overrideProxy: boolean = false;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async info(media: T): Promise<U | undefined> {
        return undefined;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async fetchContentData(media: T): Promise<Episode[] | Chapter[] | undefined> {
        return undefined;
    }

    get priorityArea(): MediaInfoKeys[] {
        return [];
    }

    get sharedArea(): MediaInfoKeys[] {
        return [];
    }

    async request(url: string, config: RequestInit = {}, proxyRequest?: boolean): Promise<Response> {
        if (proxyRequest === undefined && this.needsProxy) proxyRequest = true;
        if (proxyRequest !== undefined && proxyRequest === false && this.needsProxy) proxyRequest = false;
        if (proxyRequest === undefined && !this.needsProxy) proxyRequest = false;
        if (proxyRequest !== undefined && proxyRequest === true && !this.needsProxy) proxyRequest = true;

        return Http.request(this.id, this.useGoogleTranslate, url, config, proxyRequest, 0, this.customProxy);
    }
}
