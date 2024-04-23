import { load } from "cheerio";
import { extract } from "@extractus/article-extractor";
import MangaProvider from ".";
import { Format } from "../../../types/enums";
import { Chapter, Page, Result } from "../../../types/types";
import { env } from "../../../env";

export default class NovelUpdates extends MangaProvider {
    override rateLimit = 1000;
    override id = "novelupdates";
    override url = "https://www.novelupdates.com";

    public needsProxy: boolean = true;
    public overrideProxy: boolean = true;

    override formats: Format[] = [Format.NOVEL];

    private genreMappings = {
        ACTION: 8,
        ADULT: 280,
        ADVENTURE: 13,
        COMEDY: 17,
        DRAMA: 9,
        ECCHI: 292,
        FANTASY: 5,
        GENDER_BENDER: 168,
        HAREM: 3,
        HISTORICAL: 330,
        HORROR: 343,
        JOSEI: 324,
        MARTIAL_ARTS: 14,
        MATURE: 4,
        MECHA: 10,
        MYSTERY: 245,
        PSYCHOLOGICAL: 486,
        ROMANCE: 15,
        SCHOOL_LIFE: 6,
        SCI_FI: 11,
        SEINEN: 18,
        SHOUJO: 157,
        SHOUJO_AI: 851,
        SHOUNEN: 12,
        SHOUNEN_AI: 1692,
        SLICE_OF_LIFE: 7,
        SMUT: 281,
        SPORTS: 1357,
        SUPERNATURAL: 16,
        TRAGEDY: 132,
        WUXIA: 479,
        XIANXIA: 480,
        XUANHUAN: 3954,
        YAOI: 560,
        YURI: 922,
    };

    override async search(query: string, format?: Format, year?: number, retries = 0): Promise<Result[] | undefined> {
        if (this.customProxy) {
            // For proxy testing purposes only.
            return (await this.fetchChapters(query)) as undefined;
        }

        if (retries >= 5) return undefined;

        const results: Result[] = [];

        const searchData = await this.request(`${this.url}/series-finder/?sf=1&sh=${encodeURIComponent(query)}&nt=2443,26874,2444&ge=${this.genreMappings.ADULT}&sort=sread&order=desc`, {
            method: "GET",
            headers: {
                Referer: this.url,
            },
        });

        const data = await searchData.text();

        const $ = load(data);

        const title = $("title").html();
        if (title === "Just a moment..." || title === "Attention Required! | Cloudflare") {
            return this.search(query, format, year, retries + 1);
        }

        $("div.search_main_box_nu").each((_, el) => {
            const img = $(el).find("div.search_img_nu img").attr("src");
            const title = $(el).find("div.search_body_nu div.search_title a").text();
            const id = $(el).find("div.search_body_nu div.search_title a").attr("href")?.split("/series/")[1].split("/")[0];

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

    override async fetchChapters(id: string, retries = 0): Promise<Chapter[] | undefined> {
        if (retries >= 5) return undefined;

        const chapters: Chapter[] = [];

        let data = await (await this.request(`${this.url}/series/${id}`, { headers: { Referer: this.url } })).text();
        let $ = load(data);

        const title = $("title").html();
        if (title === "Page not found - Novel Updates") {
            this.useGoogleTranslate = false;

            data = await (
                await this.request(`${this.url}/series/${id}`, {
                    headers: {
                        Referer: this.url,
                        Origin: this.url,
                    },
                })
            ).text();

            $ = load(data);

            this.useGoogleTranslate = true;
        }
        if (title === "Just a moment..." || title === "Attention Required! | Cloudflare") {
            return this.fetchChapters(id, retries + 1);
        }

        const postId = $("input#mypostid").attr("value");

        this.useGoogleTranslate = false;
        const chapterData = (
            await (
                await this.request(`${this.url}/wp-admin/admin-ajax.php`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                        Cookie: env.NOVELUPDATES_LOGIN ?? "",
                        Origin: this.url,
                    },
                    body: `action=nd_getchapters&mypostid=${postId}&mypostid2=0`,
                })
            ).text()
        ).substring(1);

        this.useGoogleTranslate = true;

        const $$ = load(chapterData);

        if (chapterData.includes("not whitelisted by the operator of this proxy") || $$("title").html() === "Just a moment...") return this.fetchChapters(id, retries + 1);

        const uniqueTitles = new Set<string>();
        $$("li.sp_li_chp a[data-id]").each((index, el) => {
            const id = $$(el).attr("data-id");
            const title = $$(el).find("span").text();

            if (!uniqueTitles.has(title)) {
                uniqueTitles.add(title);

                chapters.push({
                    id: id!,
                    title: title!,
                    number: index + 1,
                    rating: null,
                });
            }
        });

        return chapters.reverse();
    }

    override async fetchPages(id: string): Promise<Page[] | string | undefined> {
        const req = await this.request(`${this.url}/extnu/${id}/`, {
            method: "GET",
            headers: {
                Cookie: "_ga=;",
            },
            redirect: "follow",
        });

        if (!req.ok) return undefined;

        const data = await req.text();
        const $ = load(data);
        const baseURL = $("base").attr("href")?.replace("http://", "https://") ?? this.url;

        const article = await extract(
            baseURL,
            {},
            {
                headers: {
                    Cookie: "_ga=;",
                },
            },
        );
        return article?.content;
    }
}
