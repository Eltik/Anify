import MangaProvider from ".";
import { Format } from "../../../types/enums";
import { Chapter, Page, Result } from "../../../types/types";
import { load } from "cheerio";

export default class Mangakakalot extends MangaProvider {
    override rateLimit = 250;
    override id = "mangakakalot";
    override url = "https://mangakakalot.com";

    override formats: Format[] = [Format.MANGA, Format.ONE_SHOT];

    override async search(query: string, format?: Format): Promise<Result[] | undefined> {
        const temp = await (
            await this.request(`${this.url}/home_json_search`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                },
                body: `searchword=${query}&searchstyle=1`,
            })
        ).text();

        let data: SearchResult[] = [];

        try {
            data = JSON.parse(temp);
        } catch (e) {
            data = JSON.parse(temp.split("</div>")[1]);
        }

        const results: Result[] = [];

        const promises: Promise<void>[] = [];

        for (let i = 0; i < data.length; i++) {
            const result = data[i];

            promises.push(
                new Promise(async (resolve) => {
                    const id = result.story_link.startsWith(this.url) ? result.story_link.split(this.url)[1].slice(1) : result.story_link.split("/")[3];
                    const url = id.includes("manga/") ? this.url : "https://readmanganato.com";

                    const data = await (await this.request(`${url}/${id}`)).text();
                    const $ = load(data);

                    const title: string = url === "https://readmanganato.com" ? $("div.panel-story-info > div.story-info-right > h1").text() : $("div.manga-info-top > ul > li:nth-child(1) > h1").text();
                    const img: string = (url === "https://readmanganato.com" ? $("div.story-info-left > span.info-image > img").attr("src") : $("div.manga-info-top > div > img").attr("src")) ?? "";
                    const altTitles: string[] =
                        url === "https://readmanganato.com"
                            ? $("div.story-info-right > table > tbody > tr:nth-child(1) > td.table-value > h2").text().split(";")
                            : $("div.manga-info-top > ul > li:nth-child(1) > h2")
                                  .text()
                                  .replace("Alternative :", "")
                                  .split(";")
                                  .map((x) => x.trim());

                    results.push({
                        id: id,
                        title: title,
                        altTitles,
                        img,
                        format: format ?? Format.UNKNOWN,
                        year: 0,
                        providerId: this.id,
                    });

                    resolve();
                }),
            );
        }

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
            const data = await (await this.request(`https://readmanganato.com/${id}`)).text();
            const $ = load(data);

            $("div.container-main-left > div.panel-story-chapter-list > ul > li")
                .toArray()
                .reverse()
                .map((el, i) => {
                    chapters.push({
                        id: ($(el).find("a").attr("href")?.split(".com/")[1] ?? "") + "$$READMANGANATO",
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
        const url = !id.includes("$$READMANGANATO") ? `${this.url}/chapter/${id}` : `https://readmanganato.com/${id.replace("$$READMANGANATO", "")}`;
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
}

interface SearchResult {
    id: string;
    name: string;
    nameunsigned: string;
    lastchapter: string;
    image: string;
    author: string;
    story_link: string;
}
