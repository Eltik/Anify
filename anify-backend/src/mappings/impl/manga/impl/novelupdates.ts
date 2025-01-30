import { load } from "cheerio";
import MangaProvider from "..";
import { type IChapter, type IProviderResult, MediaFormat } from "../../../../types";
import { NovelProviders, type IPage } from "../../../../types/impl/mappings/impl/manga";
import { env } from "../../../../env";
import { NOVEL_EXTRACTOR_MAP, extractNovel } from "../../../../novel-extractors";
import { extract } from "@extractus/article-extractor";

export default class NovelUpdates extends MangaProvider {
    override rateLimit: number = 100; // Needs a high rate limit cause bruh
    override maxConcurrentRequests: number = 7;
    override id = "novelupdates";
    override url = "https://www.novelupdates.com";

    public needsProxy: boolean = true;
    public useGoogleTranslate: boolean = false;

    override formats: MediaFormat[] = [MediaFormat.NOVEL];

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

    override async search(query: string, format?: MediaFormat, year?: number, retries = 0): Promise<IProviderResult[] | undefined> {
        const results: IProviderResult[] = [];

        const searchData = await this.request(`${this.url}/series-finder/?sf=1&sh=${encodeURIComponent(query)}&nt=2443,26874,2444&ge=${this.genreMappings.ADULT}&sort=sread&order=desc`, {
            method: "GET",
            headers: {
                Referer: this.url,
                "User-Agent": "Mozilla/5.0",
            },
            validateResponse: async (response) => {
                if (!response.ok) return false;
                return (await response.text()).length > 0;
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
                format: MediaFormat.NOVEL,
                providerId: this.id,
                year: 0,
            });
        });

        return results;
    }

    override async fetchChapters(id: string): Promise<IChapter[] | undefined> {
        // First, get the first page to determine total number of pages
        const firstPageData = await (
            await this.request(
                `${this.url}/series/${id}/?pg=1#myTable`,
                {
                    headers: {
                        Cookie: env.NOVELUPDATES_LOGIN ?? "",
                        "User-Agent": "Mozilla/5.0",
                    },
                },
                false,
            )
        ).text();

        const firstPage$ = load(firstPageData);

        // Check if there are any chapters
        const chaptersTable = firstPage$("div.l-submain table#myTable");
        if (!chaptersTable.length) {
            return [];
        }

        // Find the last page number from pagination
        const lastPageLink = firstPage$("div.digg_pagination a").last();
        const totalPages = lastPageLink.length ? parseInt(lastPageLink.attr("href")?.split("pg=")[1] ?? "1") : 1;

        // Create array of page numbers to fetch
        const pagePromises = Array.from({ length: totalPages }, (_, i) => i + 1).map(async (pageNum) => {
            const data = await (
                await this.request(
                    `${this.url}/series/${id}/?pg=${pageNum}#myTable`,
                    {
                        headers: {
                            Cookie: env.NOVELUPDATES_LOGIN ?? "",
                            "User-Agent": "Mozilla/5.0",
                        },
                    },
                    false,
                )
            ).text();

            const $ = load(data);
            const pageChapters: IChapter[] = [];

            $("div.l-submain table#myTable tr").each((idx, el) => {
                const title = $(el).find("td a.chp-release").attr("title");
                const chapterId = $(el).find("td a.chp-release").attr("href")?.split("/extnu/")[1].split("/")[0];

                if (!title || !chapterId) return;

                pageChapters.push({
                    id: chapterId,
                    title: title,
                    number: idx, // Just use the index as the number since we'll sort by updatedAt
                    rating: null,
                    updatedAt: new Date($(el).find("td").first().text().trim()).getTime(),
                });
            });

            return pageChapters;
        });

        // Wait for all pages to be fetched
        const chaptersByPage = await Promise.all(pagePromises);

        // Flatten and filter out duplicates by ID
        const chapters = chaptersByPage
            .flat()
            .filter((chapter, index, self) => index === self.findIndex((c) => c.id === chapter.id))
            .sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)); // Sort by updatedAt in descending order, fallback to 0 if undefined

        // Reassign numbers based on sorted order
        chapters.forEach((chapter, idx) => {
            chapter.number = idx;
        });

        return chapters.reverse();
    }

    override async fetchPages(id: string, proxy: boolean = true, chapter: IChapter | null = null): Promise<IPage[] | string | undefined> {
        const req = await this.request(
            `${this.url}/extnu/${id}/`,
            {
                method: "GET",
                headers: {
                    Referer: this.url,
                    "User-Agent": "Mozilla/5.0",
                },
                redirect: "follow",
            },
            proxy,
        );

        if (req.status === 500 || req.statusText === "Timeout" || (req.status === 400 && req.statusText === "Bad Request")) return await this.fetchPages(id, false, chapter);
        const baseURL = new URL(req.url).origin;

        switch (true) {
            case baseURL.includes("zetrotranslation.com"):
                return await extractNovel(req.url, NovelProviders.ZetroTranslations, chapter);
            default:
                try {
                    const article = await extract(
                        req.url,
                        {},
                        {
                            headers: {
                                Cookie: "_ga=;",
                            },
                        },
                    );
                    return article?.content;
                } catch (e) {
                    console.error(e);
                    return "Error extracting chapter content for " + baseURL + ".";
                }
        }
    }

    override async proxyCheck(proxyURL: string): Promise<boolean | undefined> {
        try {
            const results: IProviderResult[] = [];

            const searchData = await this.request(`${this.url}/series-finder/?sf=1&sh=${encodeURIComponent("Mushoku Tensei")}&nt=2443,26874,2444&ge=${this.genreMappings.ADULT}&sort=sread&order=desc`, {
                proxy: proxyURL,
                method: "GET",
                headers: {
                    Referer: this.url,
                    "User-Agent": "Mozilla/5.0",
                },
            });

            const data = await searchData.text();

            const $ = load(data);

            const title = $("title").html();
            if (title === "Just a moment..." || title === "Attention Required! | Cloudflare") {
                return false;
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
                    format: MediaFormat.NOVEL,
                    providerId: this.id,
                    year: 0,
                });
            });

            if (results.length > 0) {
                for (const novelExtractor of Object.values(NOVEL_EXTRACTOR_MAP)) {
                    if (novelExtractor.needsProxy) {
                        const test = await fetch(novelExtractor.url);
                        if (!test.ok) return false;
                    }
                }

                return true;
            } else {
                return false;
            }
        } catch {
            return false;
        }
    }
}
