import Http from "../../../helper/request";
import { Format, ProviderType } from "../../../types/enums";
import { Chapter, Manga, Page, Result } from "../../../types/types";

export default abstract class MangaProvider {
    abstract rateLimit: number;
    abstract id: string;
    abstract url: string;
    abstract formats: Format[];

    public providerType: ProviderType = ProviderType.MANGA;
    public preferredTitle: "english" | "romaji" | "native" = "english";

    public customProxy: string | undefined;
    public needsProxy: boolean = false;
    public useGoogleTranslate: boolean = true;
    public overrideProxy: boolean = false;

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        return undefined;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async fetchChapters(id: string): Promise<Chapter[] | undefined> {
        return undefined;
    }

    async fetchRecent(): Promise<Manga[] | undefined> {
        return undefined;
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    async fetchPages(id: string): Promise<Page[] | string | undefined> {
        return undefined;
    }

    async request(url: string, config: RequestInit = {}, proxyRequest?: boolean): Promise<Response> {
        if (proxyRequest === undefined && this.needsProxy) proxyRequest = true;
        if (proxyRequest !== undefined && proxyRequest === false && this.needsProxy) proxyRequest = false;
        if (proxyRequest === undefined && !this.needsProxy) proxyRequest = false;
        if (proxyRequest !== undefined && proxyRequest === true && !this.needsProxy) proxyRequest = true;

        return Http.request(this.id, this.useGoogleTranslate, url, config, proxyRequest, 0, this.customProxy);
    }

    padNum(number: string, places: number): string {
        // Credit to https://stackoverflow.com/a/10073788
        /*
         * '17'
         * '17.5'
         * '17-17.5'
         * '17 - 17.5'
         * '17-123456789'
         */
        let range = number.split("-");
        range = range.map((chapter) => {
            chapter = chapter.trim();
            const digits = chapter.split(".")[0].length;
            return "0".repeat(Math.max(0, places - digits)) + chapter;
        });
        return range.join("-");
    }
}
