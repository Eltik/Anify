import MangaProvider from ".";
import { Format } from "../../../types/enums";
import { Result } from "../../../types/types";
import { load } from "cheerio";

export default class Mangakakalot extends MangaProvider {
    override rateLimit = 250;
    override id = "mangakakalot";
    override url = "https://mangakakalot.com";

    override formats: Format[] = [Format.MANGA, Format.ONE_SHOT];

    override async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        /*
        const data: SearchResult[] = await (await this.request(`${this.url}/home_json_search`, {
            method: "POST",
            headers: {
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: `searchword=${query}&searchstyle=1`,
        })).json();
        */
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
                new Promise(async (resolve, reject) => {
                    const id = result.story_link.split("/")[3];
                    const url = id.includes("read") ? this.url : "https://readmanganato.com";

                    const data = await (await this.request(`${url}/${id}`)).text();
                    const $ = load(data);

                    let title: string = url === "https://readmanganato.com" ? $("div.panel-story-info > div.story-info-right > h1").text() : $("div.manga-info-top > ul > li:nth-child(1) > h1").text();
                    let img: string = (url === "https://readmanganato.com" ? $("div.story-info-left > span.info-image > img").attr("src") : $("div.manga-info-top > div > img").attr("src")) ?? "";
                    const altTitles: string[] = url === "https://readmanganato.com" ? $("div.story-info-right > table > tbody > tr:nth-child(1) > td.table-value > h2").text().split(";") : $("div.manga-info-top > ul > li:nth-child(1) > h2").text().replace("Alternative :", "").split(";");

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
