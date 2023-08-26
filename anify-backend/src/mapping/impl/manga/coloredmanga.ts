import { load } from "cheerio";
import MangaProvider, { Chapter, Page } from ".";
import { Format, Result } from "../..";
import colors from "colors";

export default class ColoredManga extends MangaProvider {
    override rateLimit = 250;
    override id = "coloredmanga";
    override url = "https://coloredmanga.com";

    override formats: Format[] = [Format.MANGA, Format.ONE_SHOT];

    override async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        const data = await (await this.request(`${this.url}/?s=${encodeURIComponent(query)}&post_type=wp-manga&op=&author=&artist=&release${year ?? ""}=&adult=`))?.text();

        const $ = load(data);

        const results: Result[] = [];

        $("div.site-content div.main-col-inner div.search-wrap div.row").map((index, element) => {
            const id = $(element).find("a").attr("href")?.split(this.url)[1]!;
            const title = $(element).find("a").attr("title");
            const img = $(element).find("img").attr("src");

            const tabMeta = $(element).find("div.tab-summary");

            const altTitles: string[] = tabMeta.find("div.mg_alternative div.summary-content")?.text()?.trim() ? [tabMeta.find("div.mg_alternative div.summary-content")?.text()?.trim()] : [];

            results.push({
                id: id ?? "",
                altTitles,
                format: Format.UNKNOWN,
                img: img ?? "",
                providerId: this.id,
                title: title ?? "",
                year: year ?? 0,
            });
        });

        return results;
    }

    override async fetchChapters(id: string): Promise<Chapter[] | undefined> {
        const data = await (await this.request(`${this.url}${id}`))?.text();

        const $ = load(data);

        const chapters: Chapter[] = [];

        $("div.listing-chapters_wrap ul li").map((index, element) => {
            const volumeName = $(element).find("a")?.text()?.split(" - ")[0];
            const subChapters = $(element).find("ul.sub-chap-list li");

            $(subChapters).map((index, element) => {
                const id = $(element).find("a")?.attr("href")?.split(this.url)[1];
                const title = $(element).find("a")?.text();

                chapters.push({
                    id: id ?? "",
                    number: title.includes("Episode ") ? Number(title.split("Episode ")[1]) : Number(title.split("Chapter ")[1]?.split(" ")[0] ?? index),
                    title: title?.trim() ?? "",
                });
            });
        });

        return chapters;
    }

    override async fetchPages(id: string): Promise<string | Page[] | undefined> {
        const data = await (await this.request(`${this.url}${id}`))?.text();

        const $ = load(data);

        const pages: Page[] = [];

        $("div.reading-content img").map((index, element) => {
            pages.push({
                url: $(element).attr("src")?.trim() ?? "",
                index,
                headers: {},
            });
        });

        return pages;
    }
}
