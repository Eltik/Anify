import { load } from "cheerio";
import MetaProvider from ".";
import { Format, Type } from "../../../types/enums";
import { Result } from "../../../types/types";

export default class AniDBMeta extends MetaProvider {
    override id = "anidb";
    override url = "https://anidb.net";

    override rateLimit = 500;
    override formats: Format[] = [Format.TV, Format.MOVIE, Format.ONA, Format.SPECIAL, Format.TV_SHORT, Format.OVA, Format.MANGA, Format.ONE_SHOT, Format.NOVEL];

    override async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        const results: Result[] = [];

        const data = await (await this.request(`https://anidb.net/search/fulltext/?adb.search=${encodeURIComponent(query)}&do.search=1&entity.animetb=1&field.titles=1`, {}, true)).text();

        const $ = load(data);

        $("table.search_results tbody tr.g_odd").map((i, el) => {
            results.push({
                id: $(el).find("td.relid a").attr("href") ?? "",
                altTitles:
                    $(el)
                        .find("td.excerpt")
                        .text()
                        ?.split(" - ")
                        .map((title) => title.trim()) ?? [],
                title: $(el).find("td.relid a").text()?.trim(),
                format: Format.UNKNOWN,
                img: $(el).find("td.thumb img").attr("src") ?? "",
                providerId: this.id,
                year: 0,
            });
        });

        return results;
    }
}
