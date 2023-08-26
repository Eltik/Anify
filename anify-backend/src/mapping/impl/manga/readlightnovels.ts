import MangaProvider, { Chapter, Page } from ".";
import { Format, Result } from "../..";
import { load } from "cheerio";

export default class ReadLightNovels extends MangaProvider {
    override rateLimit = 250;
    override id = "readlightnovels";
    override url = "https://readlightnovels.net";

    override formats: Format[] = [Format.NOVEL];

    override async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        const results: Result[] = [];

        const data = await (
            await this.request(`${this.url}/?s=${encodeURIComponent(query)}`, {
                method: "POST",
            })
        ).text();

        const $ = load(data);

        $("div.col-xs-12.col-sm-12.col-md-9.col-truyen-main > div:nth-child(1) > div > div:nth-child(2) > div.col-md-3.col-sm-6.col-xs-6.home-truyendecu").each((i, el) => {
            results.push({
                id: $(el).find("a").attr("href")!.split(this.url)[1],
                title: $(el).find("a").attr("title")!,
                altTitles: [],
                img: $(el).find("a > img").attr("src")!,
                year: 0,
                format: Format.NOVEL,
                providerId: this.id,
            });
        });

        return results;
    }

    override async fetchChapters(id: string): Promise<Chapter[] | undefined> {
        id = id.replace(".html", "");

        const chapters: Chapter[] = [];

        const data = await (
            await this.request(`${this.url}${id}.html`, {
                headers: {
                    Referer: `${this.url}${id}.html`,
                },
            })
        ).text();

        const $ = load(data);

        const pages =
            Math.max(
                ...$("#pagination > ul > li")
                    .map((i, el) => parseInt($(el).find("a").attr("data-page")!))
                    .get()
                    .filter((x) => !isNaN(x))
            ) != -Infinity
                ? Math.max(
                      ...$("#pagination > ul > li")
                          .map((i, el) => parseInt($(el).find("a").attr("data-page")!))
                          .get()
                          .filter((x) => !isNaN(x))
                  )
                : 0;

        const novelId = parseInt($("#id_post").val() as string);

        const bodyFormData = new FormData();
        bodyFormData.append("action", "tw_ajax");
        bodyFormData.append("type", "pagination");
        bodyFormData.append("page", String(pages));
        bodyFormData.append("id", String(novelId));

        for (const chapter of $("ul.list-chapter > li")) {
            const subId = $(chapter).find("a").attr("href")!.split("/")?.pop()!.replace(".html", "")!;
            const id = $(chapter).find("a").attr("href")!.split("/")[3];
            chapters.push({
                id: `/${id}/${subId}`,
                title: $(chapter).find("a > span").text().trim(),
                number: parseFloat($(chapter).find("a > span").text().trim().split(" ")[1]),
            });
        }

        return chapters;
    }

    override async fetchPages(id: string): Promise<string | Page[] | undefined> {
        const data = await (await this.request(`${this.url}${id}.html`)).text();

        const $ = load(data);

        let contents = "";

        for (const line of $("div.chapter-content > p")) {
            if ($(line).text() != "") {
                contents += `${$(line).text()}\n`;
            }
        }

        return contents;
    }
}
