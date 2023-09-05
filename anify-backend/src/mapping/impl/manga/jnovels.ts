import MangaProvider, { Chapter, Page } from ".";
import { Format, Result } from "../..";
import { load } from "cheerio";
import { compareTwoStrings } from "../../../helper/stringSimilarity";

export default class JNovels extends MangaProvider {
    override rateLimit = 250;
    override id = "jnovels";
    override url = "https://jnovels.com";

    override formats: Format[] = [Format.NOVEL];

    override async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        const results: Result[] = [];
        const list: Result[] = [];

        const req = await this.request(`${this.url}/11light-1novel20-pdf/`);
        const $ = load(await req.text());

        $("div.post-content ol li").map((i, el) => {
            const id = $(el).find("a").attr("href")?.split(this.url)[1]!;
            const title = $(el).find("a").text()?.trim() ?? "";

            list.push({
                id: id,
                title: title,
                altTitles: [],
                img: null,
                year: 0,
                format: Format.NOVEL,
                providerId: this.id,
            });
        });

        for (const result of list) {
            if (compareTwoStrings(query, result.title) > 0.3) {
                results.push(result);
            }
        }

        if (results.length === 0) {
            const req = await this.request(`${this.url}/hwebnovels-lista14/`);
            const $ = load(await req.text());

            $("div.post-content ol li").map((i, el) => {
                const id = $(el).find("a").attr("href")!.split(this.url)[1]!;
                const title = $(el).find("a").text()?.trim() ?? "";

                list.push({
                    id: id,
                    title: title,
                    altTitles: [],
                    img: null,
                    year: 0,
                    format: Format.NOVEL,
                    providerId: this.id,
                });
            });

            for (const result of list) {
                if (compareTwoStrings(query, result.title) > 0.3) {
                    results.push(result);
                }
            }
        }

        return results;
    }

    override async fetchChapters(id: string): Promise<Chapter[] | undefined> {
        const chapters: Chapter[] = [];

        const data = await (await this.request(`${this.url}${id}`)).text();

        const $ = load(data);

        $("main div.post-content ol li").map((i, el) => {
            const id = $(el).find("a").attr("href")!;
            if (id && !id.includes(this.url)) {
                const title = $(el).text()?.split(" ——")[0];
                chapters.push({
                    id: id,
                    title: title?.trim(),
                    number: i + 1,
                });
            }
        });

        return chapters;
    }

    override async fetchPages(id: string): Promise<string | Page[] | undefined> {
        return `No content able to read! You may download the novel <a href="${id}">here</a>.`;
    }
}
