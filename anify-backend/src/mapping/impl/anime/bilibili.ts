import AnimeProvider, { Episode, Source, StreamingServers, SubType } from ".";
import { Format, Formats, Result } from "../..";
import { load } from "cheerio";
import Extractor from "@/src/helper/extractor";

export default class Bilibili extends AnimeProvider {
    override rateLimit = 250;
    override id = "bilibili";
    override url = "https://bilibili.com";

    private api = "https://app.biliintl.com/intl/gateway/v2";

    override formats: Format[] = [Format.MOVIE, Format.ONA, Format.OVA, Format.SPECIAL, Format.TV, Format.TV_SHORT];

    override get subTypes(): SubType[] {
        return [SubType.SUB];
    }

    override get headers(): Record<string, string> | undefined {
        return { Referer: "https://kwik.cx" };
    }

    override async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        // https://app.biliintl.com/intl/gateway/v2/app/search/type?keyword=${query}&type=7
        const request = await this.request(`${this.api}/app/search/type?keyword=${encodeURIComponent(query)}&type=7`);
        if (!request.ok) {
            return [];
        }
        const data = await request.json();
        const results: Result[] = [];

        console.log(data)

        if (!data?.data) {
            return [];
        }

        data.data.map((item) => {
            const formatString: string = item.type.toUpperCase();
            const f: Format = Formats.includes(formatString as Format) ? (formatString as Format) : Format.UNKNOWN;

            results.push({
                id: String(item.id) ?? item.session,
                title: item.title,
                year: item.year,
                img: item.poster,
                format: f,
                altTitles: [],
                providerId: this.id,
            });
        });

        return results;
    }
}
