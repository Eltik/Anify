import { wait } from "@/src/helper";
import MangaProvider, { Chapter, Page } from ".";
import { Format, Formats, Result } from "../..";
import { load } from "cheerio";

export default class MangaFox extends MangaProvider {
    override rateLimit = 250;
    override id = "mangafox";
    override url = "https://fanfox.net";

    override formats: Format[] = [Format.MANGA, Format.ONE_SHOT];

    override async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        const results: Result[] = [];
        
        const data = await (await this.request(`${this.url}/search?title=${query}${year && year != 0 ? `&released=${year}` : ""}`)).text();
        const $ = load(data);

        $("ul.manga-list-4-list li").map((i, el) => {
            const title = $(el).find("a").attr("title");
            const img = $(el).find("img").attr("src");

            results.push({
                id: $(el).find("a").attr("href") ?? "",
                altTitles: [],
                format: Format.UNKNOWN,
                img: img ?? "",
                providerId: this.id,
                title: title ?? "",
                year: 0
            })
        })

        return results;
    }

    override async fetchChapters(id: string): Promise<Chapter[] | undefined> {
        const results: Chapter[] = [];

        const data = await (await this.request(`${this.url}${id}`)).text();

        const $ = load(data);
        $("div#list-1 ul.detail-main-list li").map((i, el) => {
            let title = $(el).find("a").attr("title");
            if (title?.includes(" - ")) {
                title = title.split(" - ")[0];
            }

            let volume = -1.0;
            let chapter = -1.0;
            
            if (title?.includes("Vol.") && title.includes("Ch.")) {
                volume = Number(title.split("Vol.")[1].split("Ch.")[0].trim());
                chapter = Number(title.split("Vol.")[1].split("Ch.")[1].trim());
            } else if (title?.includes("Vol.")) {
                volume = Number(title.split("Vol.")[1].trim());
            } else if (title?.includes("Ch.")) {
                chapter = Number(title.split("Ch.")[1].trim());
            }

            results.push({
                id: $(el).find("a").attr("href")?.replace("/manga/", "")?.replace("/1.html", "") ?? "",
                number: chapter != -1.0 ? chapter : i,
                title: title ?? "",
                updatedAt: new Date($(el).find("a p.title2").text()).getTime()
            })
        })

        return results;
    }

    override async fetchPages(id: string): Promise<string | Page[] | undefined> {
        const pages: Page[] = [];

        const data = await (await this.request(`https://m.fanfox.net/roll_manga/${id}/1.html`, {
            headers: {
                Cookie: "readway=2"
            }
        })).text();

        const $ = load(data);

        $("div#viewer img").map((i, el) => {
            pages.push({
                url: $(el).attr("data-original")?.startsWith("//") ? `https:${$(el).attr("data-original")}` : $(el).attr("data-original") ?? "",
                index: i,
                headers: {
                    Referer: "https://m.fanfox.net"
                }
            })
        });

        return pages;
    }
}
