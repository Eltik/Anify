import MangaProvider, { Chapter, Page } from ".";
import { Format, Result } from "../..";
import { load } from "cheerio";

export default class MangaBuddy extends MangaProvider {
    override rateLimit = 250;
    override id = "mangabuddy";
    override url = "https://mangabuddy.com";

    override formats: Format[] = [Format.MANGA, Format.ONE_SHOT];

    override async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        const results: Result[] = [];

        const data = await (await this.request(`${this.url}/api/manga/search?q=${encodeURIComponent(query)}`)).text();

        const $ = load(data);

        $("div.novel__item").map((i, el) => {
            const url = `${$(el).find("a").attr("href")}`;
            const title = $(el).find("a").attr("title");
            const img = `${$(el).find("img").attr("src")}`;

            const altTitles: string[] = [];

            const titles = $(el).find("div.name span:eq(2)").text();
            if (titles.split(" ;").length > 0) {
                titles.split(" ;").forEach((item) => {
                    if (item.includes("(") && item.includes(")")) {
                        item = item.split(")")[0].split("(")[0];
                    }
                    altTitles.push(item.trim());
                });
            }
            if (titles.split(" ,").length > 0) {
                titles.split(" ,").forEach((item) => {
                    if (item.includes("(") && item.includes(")")) {
                        item = item.split(")")[0].split("(")[0];
                    }
                    altTitles.push(item.trim());
                });
            }

            results.push({
                id: url,
                title: title?.trim()!,
                img: img,
                year: 0,
                format: Format.UNKNOWN,
                altTitles: altTitles,
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
        const response = await this.request(`${this.url}${id}`);
        const html = await response.text();

        const regex = /var chapImages = '([^']+)'/;
        const match = html.match(regex);
        if (match) {
            const chapImagesValue = match[1];
            try {
                const data = chapImagesValue.split(",");

                return data.map((page, index) => {
                    return {
                        url: page,
                        index,
                        headers: {
                            Referer: this.url,
                        },
                    } as Page;
                });
            } catch (e) {
                return undefined;
            }
        }

        return undefined;
    }
}
