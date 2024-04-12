import { load } from "cheerio";
import MangaProvider from ".";
import { Format } from "../../../types/enums";
import { Chapter, Page, Result } from "../../../types/types";

export default class FirstKissNovel extends MangaProvider {
    override rateLimit = 1000;
    override id = "1stkissnovel";
    override url = "https://1stkissnovel.org";

    public needsProxy: boolean = false;

    override formats: Format[] = [Format.NOVEL];

    override async search(query: string): Promise<Result[] | undefined> {
        const results: Result[] = [];

        const data = (await (
            await this.request(`${this.url}/wp-admin/admin-ajax.php`, {
                method: "POST",
                headers: {
                    Referer: this.url,
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 OPR/107.0.0.0",
                    "X-Requested-With": "XMLHttpRequest",
                    "X-Content-Type-Options": "nosniff",
                    "X-Frame-Options": "SAMEORIGIN",
                    "X-Robots-Tag": "noindex",
                },
                body: `action=wp-manga-search-manga&title=${encodeURIComponent(query)}`,
            })
        ).json()) as {
            success: boolean;
            data: { title: string; url: string; type: string }[];
        };

        if (!data.success) return undefined;

        /*
        const promises = data.data.map(async (item) => {
            const data = await (await this.request(item.url)).text();
            
            // NOTE: The year on the info page is not accurate, therefore a secondary
            // request is not worth.
            const $ = load(data);
            const img = $("div.summary_image img").attr("src");
            
        });

        await Promise.all(promises);
        */

        for (const item of data.data) {
            results.push({
                id: item.url.split("/novel/")[1] ?? "",
                title: item.title,
                img: "",
                altTitles: [],
                format: Format.NOVEL,
                providerId: this.id,
                year: 0,
            });
        }

        return results;
    }

    override async fetchChapters(id: string): Promise<Chapter[] | undefined> {
        const chapters: Chapter[] = [];

        const data = await (
            await this.request(`${this.url}/novel/${id.endsWith("/") ? id : id + "/"}ajax/chapters`, {
                method: "POST",
                headers: {
                    Referer: `${this.url}/novel/${id}`,
                    "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                    "X-Requested-With": "XMLHttpRequest",
                },
            })
        ).text();

        const $ = load(data);

        for (let i = 0; i < $("ul .wp-manga-chapter").length; i++) {
            const el = $("ul .wp-manga-chapter").toArray().reverse()[i];
            const title = $(el).find("a").text().trim();
            const id = $(el).find("a").attr("href") ?? "";

            chapters.push({
                id: id.split(this.url)[1] ?? "",
                title,
                number: i + 1,
                rating: null,
                updatedAt: new Date($(el).find(".chapter-release-date").text().trim()).getTime(),
            });
        }

        return chapters;
    }

    override async fetchPages(id: string): Promise<Page[] | string | undefined> {
        const data = await (await this.request(`${this.url}${id}`)).text();

        const $ = load(data);
        return $("div.text-left").toString();
    }
}
