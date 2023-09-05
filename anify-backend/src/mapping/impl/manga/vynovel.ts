import MangaProvider, { Chapter, Page } from ".";
import { Format, Result } from "../..";
import { load } from "cheerio";

export default class VyNovel extends MangaProvider {
    override rateLimit = 250;
    override id = "vynovel";
    override url = "https://vynovel.com";

    override formats: Format[] = [Format.NOVEL];

    override async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        const results: Result[] = [];

        const data = await (
            await this.request(`${this.url}/api/manga/search?search=${encodeURIComponent(query)}&uid=`, {
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                },
            })
        ).json();

        for (const res of data.result) {
            results.push({
                id: res.name_url,
                title: res.name,
                altTitles: res.title ? [res.title] : [],
                format: Format.UNKNOWN,
                img: res.thumbnail,
                providerId: this.id,
                year: 0,
            });
        }

        return results;
    }

    override async fetchChapters(id: string): Promise<Chapter[] | undefined> {
        const chapters: Chapter[] = [];

        const data = await (await this.request(`${this.url}/novel/${id}`)).text();

        const $ = load(data);

        $("div.div-chapter div.list-group a").map((i, el) => {
            const id = $(el).attr("href")?.split(this.url)[1];
            const title = $(el).find("span").text();
            chapters.push({
                id: id ?? "",
                title: title?.trim(),
                number: i + 1,
                updatedAt: new Date($(el).find("p").text()).getTime(),
            });
        });

        return chapters;
    }

    override async fetchPages(id: string): Promise<string | Page[] | undefined> {
        const data = await (await this.request(`${this.url}${id}`)).text();

        const $ = load(data);

        return $("div#content-reader div.content").text() ?? "Error fetching content!";
    }
}
