import { Format, Formats, Result } from "../..";
import MetaProvider from ".";
import { env } from "@/src/env";

export default class SimklMeta extends MetaProvider {
    override rateLimit = 250;
    override id = "simkl";
    override url = "https://simkl.com";
    override formats: Format[] = [Format.TV, Format.MOVIE, Format.ONA, Format.SPECIAL, Format.TV_SHORT, Format.OVA];

    private simklKey = env.SIMKL_CLIENT_SECRET ?? "3f883e8e6cdd60d2d5e765aaf0612953f743dc77f44c422af98b38e083cf038b"; // From MALSync https://github.com/MALSync/MALSync/blob/master/src/simkl/simklClass.ts
    private simklClient = env.SIMKL_CLIENT_ID ?? "39e8640b6f1a60aaf60f3f3313475e830517badab8048a4e52ff2d10deb2b9b0"; // From MALSync https://github.com/MALSync/MALSync/blob/master/src/provider/Simkl/helper.ts
    private simklApiUrl = "https://api.simkl.com";

    override async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        const results: Result[] = [];

        const req = await this.request(`${this.simklApiUrl}/search/anime?q=${query}&client_id=${this.simklClient}`, {
            headers: {
                "Content-Type": "application/json",
                "X-Pagination-Page": "1",
                "X-Pagination-Page-Count": "10",
                "X-Pagination-Item-Count": "50",
            },
        });

        const data: SearchResponse[] = await req.json();

        if (!Array.isArray(data)) {
            return undefined;
        }

        for (const item of data) {
            const altTitles: string[] = [];

            if (item.title_en) altTitles.push(item.title_en);
            if (item.title_romaji) altTitles.push(item.title_romaji);

            results.push({
                id: item.ids.simkl_id.toString(),
                title: item.title,
                altTitles: altTitles,
                format: Format.UNKNOWN,
                img: `${this.url}/posters/${item.poster}_m.jpg`,
                year: item.year ?? 0,
                providerId: this.id,
            });
        }

        return results;
    }
}

interface SearchResponse {
    title: string;
    title_en?: string;
    title_romaji?: string;
    year: number;
    poster: string;
    ids: {
        simkl_id: number;
        slug: string;
        tmdb: string;
    };
}
