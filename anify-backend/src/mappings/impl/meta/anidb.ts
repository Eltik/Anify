import { load } from "cheerio";
import MetaProvider from ".";
import { Format, Type } from "../../../types/enums";
import { Result } from "../../../types/types";

export default class AniDBMeta extends MetaProvider {
    override id = "anidb";
    override url = "https://anidb.net";

    public needsProxy: boolean = true;
    public useGoogleTranslate: boolean = false;

    override rateLimit = 500;
    override formats: Format[] = [Format.TV, Format.MOVIE, Format.ONA, Format.SPECIAL, Format.TV_SHORT, Format.OVA];

    private formatMapping = {
        MOVIE: "type.movie=1",
        MUSIC: "type.musicvideo=1",
        OVA: "type.ova=1",
        TV: "type.tvseries=1",
        SPECIAL: "type.tvspecial=1",
    };

    override async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        const results: Result[] = [];

        const data = await (await this.request(`https://anidb.net/search/fulltext/?adb.search=${encodeURIComponent(query)}&do.search=1&entity.animetb=1&field.titles=1${format && format != Format.UNKNOWN ? `&${this.formatMapping[format?.toUpperCase() as keyof typeof this.formatMapping]}` : ""}`)).text();

        const $ = load(data);

        $("table.search_results tbody tr.g_odd").map((i, el) => {
            results.push({
                id: $(el).find("td.relid a").attr("href") ?? "",
                altTitles:
                    ($(el)
                        .find("td.excerpt")
                        .text()
                        ?.split(" - ")
                        .map((title) => (title.trim() === "…" || title.trim().includes("…") ? undefined : title.trim()))
                        .filter(Boolean) as string[]) ?? [],
                title: $(el).find("td.relid a").text()?.trim(),
                format: format ? format : Format.UNKNOWN,
                img: $(el).find("td.thumb img").attr("src") ?? "",
                providerId: this.id,
                year: 0,
            });
        });

        return results;
    }
}
