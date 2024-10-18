import MangaProvider from ".";
import { Format } from "../../../types/enums";
import { Chapter, Page, Result } from "../../../types/types";
import { load } from "cheerio";

export default class Mangakakalot extends MangaProvider {
    override rateLimit = 250;
    override id = "mangakakalot";
    override url = "https://mangakakalot.com";

    private secondURL = "https://chapmanganato.com";

    override formats: Format[] = [Format.MANGA, Format.ONE_SHOT];

    override async search(query: string, format?: Format): Promise<Result[] | undefined> {
        const results: Result[] = [];

        const data = await (await this.request(`${this.url}/search/story/${query.replace(/ /g, "_")}`)).text();
        const $ = load(data);

        const promises: Promise<void>[] = [];

        $("div.daily-update > div > div").map((i, el) => {
            const id = $(el).find("div h3 a").attr("href")?.split("/")[3];
            const title = $(el).find("div h3 a").text();
            const img = $(el).find("a img").attr("src");

            const promise = new Promise<void>(async (resolve) => {
                const url = id?.includes("read") ? this.url : this.secondURL;
                const data = await (await this.request(`${url}/${id}`)).text();

                const $$ = load(data);

                const altTitles: string[] =
                    url === this.secondURL
                        ? $$("div.story-info-right > table > tbody > tr:nth-child(1) > td.table-value > h2").text().split(";")
                        : $$("div.manga-info-top > ul > li:nth-child(1) > h2")
                              .text()
                              .replace("Alternative :", "")
                              .split(";")
                              .map((x) => x.trim());

                results.push({
                    id: id ?? "",
                    altTitles,
                    format: format ?? Format.UNKNOWN,
                    img: img ?? "",
                    providerId: this.id,
                    title,
                    year: 0,
                });

                resolve();
            });

            promises.push(promise);
        });

        await Promise.all(promises);

        return results;
    }

    override async fetchChapters(id: string): Promise<Chapter[] | undefined> {
        const chapters: Chapter[] = [];

        if (id.includes("manga/")) {
            const data = await (await this.request(`${this.url}/${id}`)).text();
            const $ = load(data);

            $("div.chapter-list > div.row")
                .toArray()
                .reverse()
                .map((el, i) => {
                    chapters.push({
                        id: $(el).find("span > a").attr("href")?.split("chapter/")[1] ?? "",
                        title: $(el).find("span > a").text(),
                        number: i + 1,
                        rating: null,
                        updatedAt: $(el).find("span:nth-child(3)").attr("title") ? new Date($(el).find("span:nth-child(3)").attr("title")!).getTime() : undefined,
                    });
                });
        } else {
            const data = await (await this.request(`${this.secondURL}/${id}`)).text();
            const $ = load(data);

            $("div.container-main-left > div.panel-story-chapter-list > ul > li")
                .toArray()
                .reverse()
                .map((el, i) => {
                    chapters.push({
                        id: `${id}/${$(el).find("a").attr("href")?.split(`${id}/`)[1] ?? ""}`,
                        title: $(el).find("a").text(),
                        number: i + 1,
                        rating: null,
                        updatedAt: $(el).find("span.chapter-time.text-nowrap").attr("title") ? new Date($(el).find("span.chapter-time.text-nowrap").attr("title")!).getTime() : undefined,
                    });
                });
        }

        return chapters.reverse();
    }

    override async fetchPages(id: string): Promise<string | Page[] | undefined> {
        const url = !id.includes("manga") ? `${this.url}/chapter/${id}` : `${this.secondURL}/${id}`;
        const data = await (await this.request(url)).text();

        const $ = load(data);

        const pages = $("div.container-chapter-reader > img")
            .map(
                (i, el): Page => ({
                    url: $(el).attr("src")!,
                    index: i,
                    headers: { Referer: this.url },
                }),
            )
            .get();

        return pages;
    }

    override async proxyCheck(): Promise<boolean | undefined> {
        const searchData = await this.search("Mushoku Tensei");
        if (!searchData || searchData!.length === 0) {
            return false;
        } else {
            return true;
        }
    }
}
