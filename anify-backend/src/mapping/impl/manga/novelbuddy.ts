import MangaProvider, { Chapter, Page } from ".";
import { Format, Result } from "../..";
import { load } from "cheerio";

export default class NovelBuddy extends MangaProvider {
    override rateLimit = 250;
    override id = "novelbuddy";
    override url = "https://novelbuddy.com";

    override formats: Format[] = [Format.NOVEL];

    override async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        const results: Result[] = [];

        // Replace non-text or number characters. For example () and [].
        const data = await (await this.request(`${this.url}/search?q=${encodeURIComponent(query)}`)).text();

        const $ = load(data);

        $("div.container div.manga-list div.book-item").map((i, el) => {
            const url = `${$(el).find("a").attr("href")}`;
            const title = $(el).find("a").attr("title");
            const img = `https:${$(el).find("img").attr("data-src")}`;

            results.push({
                id: url,
                title: title?.trim()!,
                img: img,
                year: 0,
                format: Format.NOVEL,
                altTitles: [],
                providerId: this.id,
            });
        });

        return results;
    }

    override async fetchChapters(id: string): Promise<Chapter[] | undefined> {
        const chapters: Chapter[] = [];

        const data = await (await this.request(`${this.url}${id}`)).text();

        const $ = load(data);

        $("ul.chapter-list li").map((i, el) => {
            const url = $(el).find("a").attr("href");
            const title = $(el).find("a").attr("title");
            const number = $(el).attr("id")?.split("c-")[1]!;
            const updatedAt = new Date($(el).find("time").text() ?? 0).getTime();

            chapters.push({
                id: url!,
                title: title!,
                number: parseInt(number),
                updatedAt,
            });
        });

        return chapters;
    }

    override async fetchPages(id: string): Promise<string | Page[] | undefined> {
        const req = await this.request(`${this.url}${id}`);

        const $ = load(await req.text());

        return $("div.content-inner").html()!;
    }
}
