import MangaProvider from ".";
import { Format } from "../../../types/enums";
import { Chapter, Page, Result } from "../../../types/types";
import { load } from "cheerio";

export default class MangaPill extends MangaProvider {
    override rateLimit = 250;
    override id = "mangapill";
    override url = "https://mangapill.com";

    override formats: Format[] = [Format.MANGA, Format.ONE_SHOT];

    override async search(query: string): Promise<Result[] | undefined> {
        const results: Result[] = [];

        const data = await (await this.request(`${this.url}/search?q=${encodeURIComponent(query)}`)).text();
        const $ = load(data);

        $("div.container div.my-3.justify-end > div").map((i, el) => {
            results.push({
                id: $(el).find("a").attr("href")?.split("/manga/")[1] ?? "",
                title: $(el).find("div > a > div.mt-3").text().trim(),
                altTitles: $(el).find("div > a > div.text-xs.text-secondary").text().trim() ? [$(el).find("div > a > div.text-xs.text-secondary").text().trim()] : [],
                img: $(el).find("a img").attr("data-src") ?? "",
                year: Number.isNaN(Number($($(el).find("div > div.flex > div").find("div")[1]).text().trim())) ? 0 : Number($($(el).find("div > div.flex > div").find("div")[1]).text().trim()),
                format: Format.UNKNOWN,
                providerId: this.id,
            });
        });

        return results;
    }

    override async fetchChapters(id: string): Promise<Chapter[] | undefined> {
        const chapters: Chapter[] = [];

        const data = await (await this.request(`${this.url}/manga/${id}`)).text();
        const $ = load(data);

        $("div.container div.border-border div#chapters div.grid-cols-1 a").map((i, el) => {
            chapters.push({
                id: $(el).attr("href")?.split("/chapters/")[1] ?? "",
                title: $(el).text().trim(),
                number: Number.isNaN(Number($(el).text().split("Chapter ")[1])) ? i : Number($(el).text().split("Chapter ")[1]),
                rating: null,
            });
        });

        return chapters;
    }

    override async fetchPages(id: string): Promise<string | Page[] | undefined> {
        const pages: Page[] = [];

        const data = await (await this.request(`${this.url}/chapters/${id}`)).text();
        const $ = load(data);

        const chapterSelector = $("chapter-page");

        chapterSelector.map((i, el) => {
            pages.push({
                url: $(el).find("div picture img").attr("data-src")!,
                index: Number($(el).find("div[data-summary] > div").text().split("page ")[1]?.split("/")[0] ?? i),
                headers: {
                    Referer: this.url,
                },
            });
        });

        return pages;
    }
}
