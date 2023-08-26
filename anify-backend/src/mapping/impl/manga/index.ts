import { Format, ProviderType, type Result } from "../..";
import Http from "../request";

export default abstract class MangaProvider {
    abstract rateLimit: number;
    abstract id: string;
    abstract url: string;
    abstract formats: Format[];

    public providerType: ProviderType = ProviderType.MANGA;
    public customProxy: string | undefined;

    async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        return undefined;
    }

    async fetchChapters(id: string): Promise<Chapter[] | undefined> {
        return undefined;
    }

    async fetchPages(id: string): Promise<Page[] | string | undefined> {
        return undefined;
    }

    async request(url: string, config: RequestInit = {}, proxyRequest = false): Promise<Response> {
        return Http.request(url, config, proxyRequest, 0, this.customProxy);
    }
}

export type Chapter = {
    id: string;
    title: string;
    number: number;
    updatedAt?: number;
    mixdrop?: string;
};

export type Page = {
    url: string;
    index: number;
    headers: { [key: string]: string };
};
