import { load } from "cheerio";
import MangaProvider from ".";
import { Format } from "../../../types/enums";
import { Chapter, Page, Result } from "../../../types/types";

export default class NovelHall extends MangaProvider {
    override rateLimit = 1000;
    override id = "novelhall";
    override url = "https://novelhall.com";

    public needsProxy: boolean = false;

    override formats: Format[] = [Format.NOVEL];

    override async search(query: string): Promise<Result[] | undefined> {
        const results: Result[] = [];

        const data = await (
            await this.request(`${this.url}/index.php?s=so&module=book&keyword=${encodeURIComponent(query)}`, {
                method: "GET",
                headers: {
                    Referer: this.url,
                },
            })
        ).text();

        const $ = load(data);

        $("table tr").each((i, el) => {
            const item = $(el).find("td a").toArray();
            const element = item[1];

            const title = $(element).text().trim();
            const id = $(element).attr("href") ?? "";

            results.push({
                id,
                title,
                img: "",
                altTitles: [],
                format: Format.NOVEL,
                providerId: this.id,
                year: 0,
            });
        });

        return results;
    }

    override async fetchChapters(id: string): Promise<Chapter[] | undefined> {
        const chapters: Chapter[] = [];

        const data = await (await this.request(`${this.url}${id}`)).text();

        const $ = load(data);

        for (let i = 0; i < $("div#morelist.book-catalog ul li a").length; i++) {
            const el = $("div#morelist.book-catalog ul li a").toArray()[i];

            const title = $(el).text();
            const id = $(el).attr("href") ?? "";

            chapters.push({
                id,
                title,
                number: i + 1,
                rating: null,
            });
        }

        return chapters;
    }

    override async fetchPages(id: string): Promise<Page[] | string | undefined> {
        const data = await (await this.request(`${this.url}${id}`)).text();

        const $ = load(data);
        return $("div#htmlContent.entry-content").toString();
    }
}
