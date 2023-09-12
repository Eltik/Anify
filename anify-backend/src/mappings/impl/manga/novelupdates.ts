import { load } from "cheerio";
import { extract } from "@extractus/article-extractor";
import MangaProvider from ".";
import { Format } from "../../../types/enums";
import { Chapter, Page, Result } from "../../../types/types";

export default class NovelUpdates extends MangaProvider {
    override rateLimit = 1000;
    override id = "novelupdates";
    override url = "https://www.novelupdates.com";

    override formats: Format[] = [Format.NOVEL];

    override async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        const results: Result[] = [];

        const searchData = await this.request(
            `${this.url}/series-finder/?sf=1&sh=${encodeURIComponent(query)}&nt=2443,26874,2444&ge=280&sort=sread&order=desc`,
            {
                method: "GET",
                headers: {
                    Referer: this.url,
                },
            },
            true,
        );

        const data = await searchData.text();

        const $ = load(data);

        $("div.search_main_box_nu").each((_, el) => {
            const img = $(el).find("div.search_img_nu img").attr("src");
            const title = $(el).find("div.search_body_nu div.search_title a").text();
            const id = $(el).find("div.search_body_nu div.search_title a").attr("href")?.split(this.url)[1];

            results.push({
                id: id!,
                title: title!,
                img: img!,
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

        const data = await (
            await this.request(
                `${this.url}${id}`,
                {
                    headers: {
                        Cookie: "_ga=;",
                    },
                },
                true,
            )
        ).text();

        const $ = load(data);

        const postId = $("input#mypostid").attr("value");

        const chapterData = (
            await (
                await this.request(
                    `${this.url}/wp-admin/admin-ajax.php`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                            Cookie: "_ga=;",
                        },
                        body: `action=nd_getchapters&mypostid=${postId}&mypostid2=0`,
                    },
                    true,
                )
            ).text()
        ).substring(1);

        const $$ = load(chapterData);
        $$("li.sp_li_chp a[data-id]").each((index, el) => {
            const id = $$(el).attr("data-id");
            const title = $$(el).find("span").text();

            chapters.push({
                id: id!,
                title: title!,
                number: index + 1,
            });
        });

        return chapters;
    }

    override async fetchPages(id: string): Promise<Page[] | string | undefined> {
        const data = await (
            await this.request(
                `${this.url}/extnu/${id}/`,
                {
                    method: "GET",
                    headers: {
                        Cookie: "_ga=;",
                    },
                    redirect: "follow",
                },
                true,
            )
        ).text();

        const article = await extract(data);
        return article?.content;
    }
}
