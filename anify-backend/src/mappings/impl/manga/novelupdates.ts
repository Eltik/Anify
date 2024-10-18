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
        const results: Result[] = [];

        this.useGoogleTranslate = false;
        const searchData = await this.request(`${this.url}/series-finder/?sf=1&sh=${encodeURIComponent(query)}&nt=2443,26874,2444&ge=${this.genreMappings.ADULT}&sort=sread&order=desc`, {
            method: "GET",
            headers: {
                Referer: this.url,
                "User-Agent": "Mozilla/5.0",
            },
        });
        this.useGoogleTranslate = true;

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

        // Might need to test if there are links or not. If the cookie is expired, then there won't be any links.
        // NovelUpdates recently changed things and server-renders all their chapter links.
        let hasNextPage = true;

        for (let i = 1; hasNextPage; i++) {
            this.useGoogleTranslate = false;
            const data = await (
                await this.request(
                    `${this.url}/series/${id}/?pg=${i}#myTable`,
                    {
                        headers: {
                            Cookie: env.NOVELUPDATES_LOGIN ?? "",
                            "User-Agent": "Mozilla/5.0",
                        },
                    },
                    false,
                )
            ).text(); // might need to change to true
            this.useGoogleTranslate = true;

            const $ = load(data);

            if ($("div.l-submain table#myTable tr").length < 1 || !$("div.l-submain table#myTable tr")) {
                hasNextPage = false;
                break;
            } else {
                for (let l = 0; l < $("div.l-submain table#myTable tr").length; l++) {
                    const title = $("div.l-submain table#myTable tr").eq(l).find("td a.chp-release").attr("title");
                    const id = $("div.l-submain table#myTable tr").eq(l).find("td a.chp-release").attr("href")?.split("/extnu/")[1].split("/")[0];

                    if (!title || !id) continue;

                    if ((chapters.length > 0 && chapters[chapters.length - 1].id === id) || chapters.find((c) => c.id === id)) {
                        hasNextPage = false;
                        break;
                    }

                    chapters.push({
                        id: id!,
                        title: title!,
                        number: l,
                        rating: null,
                        updatedAt: new Date($("div.l-submain table#myTable tr").eq(l).find("td").first().text().trim()).getTime(),
                    });
                }
            }
        }

        if (chapters.length === 0) {
            console.log("WARNING: Cookie seems to not work. Trying without cookie.");
            // More scuffed version that doesn't seem to work anymore. I think NovelUpdates changed things
            // and now their admin-ajax will return randomized chapters to prevent scrapers. GG

            const $ = load(
                await (
                    await this.request(`${this.url}/series/${id}/`, {
                        headers: {
                            Referer: this.url,
                            "User-Agent": "Mozilla/5.0",
                        },
                    })
                ).text(),
            );

            const postId = $("input#mypostid").attr("value");

            this.useGoogleTranslate = false;
            const chapterData = (
                await (
                    await this.request(`${this.url}/wp-admin/admin-ajax.php`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
                            Cookie: env.NOVELUPDATES_LOGIN ?? "",
                            "User-Agent": "Mozilla/5.0",
                        },
                        body: `action=nd_getchapters&mypostid=${postId}&mygrr=0`,
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

        return chapters.reverse();
    }

    override async fetchPages(id: string, proxy: boolean = true, chapter: Chapter | null = null): Promise<Page[] | string | undefined> {
        const req = await this.request(
            `${this.url}/extnu/${id}/`,
            {
                method: "GET",
                headers: {
                    Cookie: "_ga=;",
                    "User-Agent": "Mozilla/5.0",
                },
                redirect: "follow",
            },
            proxy,
        );

        if (req.status === 500 || req.statusText === "Timeout" || (req.status === 400 && req.statusText === "Bad Request")) return await this.fetchPages(id, false, chapter);

        const data = await req.text();
        const $ = load(data);
        const baseURL = $("base").attr("href")?.replace("http://", "https://") ?? this.url;

        return await this.extractChapter(baseURL, chapter);
    }

    override async proxyCheck(): Promise<boolean | undefined> {
        const searchData = await this.search("Mushoku Tensei");
        if (!searchData || searchData!.length === 0) {
            // Testing
            console.log("Search failed");

            return false;
        } else {
            const extractionTest = await new Promise(async (resolve) => {
                const storySeedling = await this.request("https://storyseedling.com/");
                const neosekai = await this.request("https://www.neosekaitranslations.com/");
                const zetro = await this.request("https://zetrotranslation.com/");

                // Testing
                if (!storySeedling.ok) console.log("StorySeedling failed");
                if (!neosekai.ok) console.log("Neosekai failed");
                if (!zetro.ok) console.log("Zetro failed");

                if (storySeedling.ok && neosekai.ok && zetro.ok) {
                    return resolve(true);
                } else {
                    return resolve(false);
                }
            });

            if (!extractionTest) {
                return false;
            } else {
                return true;
            }
        }
    }

    /**
     * @description Chapter extractor specific to certain TL sites. Uses article-extractor for general sites.
     * @param url string
     * @returns Promise<string | undefined>
     */
    private async extractChapter(url: string, chapter: Chapter | null = null): Promise<string | undefined> {
        if (url.includes("storyseedling") && url.includes("rss")) {
            const $ = load(await (await this.request(url)).text());
            const forwardTimer = $("div[@click=\"$dispatch('tools')\"] > div").attr("x-data");

            const data = await this.request(forwardTimer?.split("forwardTimer('")[1].split("')")[0] ?? "");

            const $$ = load(await data.text());
            return $$("div[@click=\"$dispatch('tools')\"]").html() ?? "";
        } else if (url.includes("travistranslations")) {
            if (url.includes("rss")) {
                const $ = load(await (await this.request(url)).text());
                const forwardTimer = $("div.reader-content > div.my-2").attr("x-data");

                const data = await this.request(forwardTimer?.split("forwardTimer('")[1].split("')")[0] ?? "");

                const $$ = load(await data.text());
                return $$("div.reader-content").html() ?? "";
            } else {
                const $ = load(await (await this.request(url)).text());
                return $("div.reader-content").html() ?? "";
            }
        } else if (url.includes("vampiramtl")) {
            const $ = load(await (await this.request(url)).text());
            if (url.includes("tgs")) {
                return $("div.entry-content").html() ?? "";
            } else {
                const url = $("div.entry-content a").attr("href");
                try {
                    this.useGoogleTranslate = false;
                    const $$ = load(await (await this.request(url ?? "")).text());
                    this.useGoogleTranslate = true;

                    return $$("div.entry-content").html() ?? "";
                } catch {
                    console.log("Error fetching chapter content for VampiraMTL.");
                    this.useGoogleTranslate = true;
                    return undefined;
                }
            }
        } else if (url.includes("neosekaitranslations")) {
            const $ = load(await (await this.request(url)).text());
            if (($("div.entry-content div.reading-content")?.html() ?? []).length === 0 && chapter && chapter?.title.length > 0) {
                const mangaId = $("div#manga-chapters-holder").attr("data-id");

                this.useGoogleTranslate = false;
                const data = await (
                    await this.request("https://www.neosekaitranslations.com/wp-admin/admin-ajax.php", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                            "X-Requested-With": "XMLHttpRequest",
                            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.118 Safari/537.36",
                            Referer: url,
                        },
                        body: `action=manga_get_chapters&manga=${mangaId}`,
                    })
                ).text();
                this.useGoogleTranslate = true;

                const $$ = load(data);

                const novelVolume = (chapter?.title.startsWith("v") ? chapter?.title.split("v")[1]?.split(" ")[0] : "").split("c")[0];
                const novelChapter = (chapter?.title.startsWith("v") ? chapter?.title.split("v")[1]?.split(" ")[0]?.split("c")[1] : chapter?.title.startsWith("c") ? chapter?.title.split("c")[1].split(" ")[0] : "") ?? "";
                const novelPart = chapter?.title.split(" ")[1]?.replace(/[^\d .-]/gi, "") ?? "";
                const novelPrologue = chapter?.title.split(" ").length > 1 ? chapter?.title.split(" ")[1]?.includes("prologue") : chapter?.title.includes("prologue");
                const novelIllustrations = chapter?.title.split(" ").length > 1 ? chapter?.title.split(" ")[1]?.includes("illustrations") : chapter?.title.includes("illustrations");

                for (let i = 0; i < $$("ul.version-chap li.wp-manga-chapter").toArray().length; i++) {
                    const el = $$("ul.version-chap li.wp-manga-chapter")[i];

                    const title = $$(el).find("a").text().trim();

                    const volume = title.toLowerCase().split("v")[1]?.split(" ")[0] ?? "";
                    const chapter = title.toLowerCase().split("chapter ")[1]?.split(" ")[0] ?? title.toLowerCase().split("ch-")[1]?.split(" ")[0] ?? title.toLowerCase().split("chp ")[1]?.split(" ")[0] ?? title.toLowerCase().split("episode ")[1]?.split(" ")[0] ?? "";
                    const part =
                        title
                            .toLowerCase()
                            .split("part ")[1]
                            ?.split(" ")[0]
                            ?.replace(/[^\d .-]/gi, "") ?? "";

                    const isPrologue = (chapter.length < 1 || chapter === "0" || chapter === "0.5") && title.toLowerCase().includes("prologue");
                    const isIllustrations = (chapter.length < 1 || chapter === "0" || chapter === "0.5") && title.toLowerCase().includes("illustrations");

                    if ((volume?.length > 0 && novelVolume?.length > 0 ? novelVolume === volume : true) && isPrologue && novelPrologue) {
                        const newURL = $$(el).find("a").attr("href");
                        const $$$ = load(await (await this.request(newURL ?? "", {}, false)).text());

                        return $$$("div.entry-content div.reading-content").html() ?? "";
                    }

                    if ((volume?.length > 0 && novelVolume?.length > 0 ? novelVolume === volume : true) && isIllustrations && novelIllustrations) {
                        const newURL = $$(el).find("a").attr("href");
                        const $$$ = load(await (await this.request(newURL ?? "", {}, false)).text());

                        return $$$("div.entry-content div.reading-content").html() ?? "";
                    }

                    if ((volume?.length > 0 && novelVolume?.length > 0 ? novelVolume === volume : true) && novelChapter === chapter && (novelPart.length > 0 ? novelPart === part : true) && !isPrologue && !isIllustrations) {
                        const newURL = $$(el).find("a").attr("href");
                        const $$$ = load(await (await this.request(newURL ?? "", {}, false)).text());

                        return $$$("div.entry-content div.reading-content").html() ?? "";
                    }
                }

                console.log(`ERROR. Could not parse chapters for Neosekai. Edge case needs to be coded in.`);
                console.log({
                    novelVolume,
                    novelChapter,
                    novelPart,
                    novelPrologue,
                    novelIllustrations,
                });
            } else {
                const $ = load(await (await this.request(url)).text());
                return $("div.entry-content div.reading-content").html() ?? "";
            }
        } else if (url.includes("plebianfinetranslation")) {
            const $ = load(await (await this.request(url)).text());
            return $("div.entry-content").html() ?? "";
        } else if (url.includes("zetrotranslation")) {
            const $ = load(await (await this.request(url)).text());
            if (($("div.entry-content_wrap div.reading-content")?.html() ?? []).length === 0 && chapter && chapter?.title.length > 0) {
                const mangaId = $("div#manga-chapters-holder").attr("data-id");
                const data = await (
                    await this.request(
                        "https://zetrotranslation.com/wp-admin/admin-ajax.php",
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/x-www-form-urlencoded",
                                "X-Requested-With": "XMLHttpRequest",
                                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.118 Safari/537.36",
                                Referer: url,
                            },
                            body: `action=manga_get_chapters&manga=${mangaId}`,
                        },
                        false,
                    )
                ).text();

                const $$ = load(data);

                const novelVolume = (chapter?.title.startsWith("v") ? chapter?.title.split("v")[1]?.split(" ")[0] : "").split("c")[0];
                const novelChapter = (chapter?.title.startsWith("v") ? chapter?.title.split("v")[1]?.split(" ")[0]?.split("c")[1] : chapter?.title.startsWith("c") ? chapter?.title.split("c")[1].split(" ")[0] : "") ?? "";
                const novelPrologue = chapter?.title.split(" ").length > 1 ? chapter?.title.split(" ")[1]?.includes("prologue") : chapter?.title.includes("prologue");
                const novelIllustrations = chapter?.title.split(" ").length > 1 ? chapter?.title.split(" ")[1]?.includes("illustrations") : chapter?.title.includes("illustrations");

                const zetroData: {
                    volume: string;
                    chapter: string;
                    part: string;
                    prologue: boolean;
                    illustrations: boolean;
                    data?: string;
                }[] = [];

                for (let i = 0; i < ($$("ul.sub-chap-list li.wp-manga-chapter").toArray().length > 0 ? $$("ul.sub-chap-list li.wp-manga-chapter").toArray().length : $$("li.wp-manga-chapter").length); i++) {
                    const el = ($$("ul.sub-chap-list li.wp-manga-chapter").toArray().length > 0 ? $$("ul.sub-chap-list li.wp-manga-chapter").toArray() : $$("li.wp-manga-chapter"))[i];

                    const title = $$(el).find("a").text().trim();
                    const volume = ($$(el).parent().parent().parent().parent().find("a.has-child").text() ?? null)?.split(" ")[0] ?? "";

                    const isPrologue = title.toLowerCase().includes("prologue");
                    const isIllustrations = title.toLowerCase().includes("illustrations");

                    const chapter = title.toLowerCase().split("chapter ")[1]?.split(" ")[0] ?? title.toLowerCase().split("ch-")[1]?.split(" ")[0] ?? title.toLowerCase().split("chp ")[1]?.split(" ")[0] ?? title.toLowerCase().split("episode ")[1]?.split(" ")[0] ?? "";

                    if ((volume?.length > 0 && novelVolume?.length > 0 ? novelVolume === volume : true) && isPrologue && novelPrologue) {
                        const newURL = $$(el).find("a").attr("href");
                        const $$$ = load(await (await this.request(newURL ?? "", {}, false)).text());

                        const currentData = zetroData.find((d) => d.volume === volume && d.prologue);
                        if (currentData) {
                            currentData.data = $$$("div.entry-content_wrap div.reading-content").html() ?? "";
                        } else {
                            zetroData.push({
                                volume,
                                chapter,
                                part: "",
                                prologue: isPrologue,
                                illustrations: isIllustrations,
                                data: $$$("div.entry-content_wrap").html() ?? "",
                            });
                        }
                    }

                    if ((volume?.length > 0 && novelVolume?.length > 0 ? novelVolume === volume : true) && isIllustrations && novelIllustrations) {
                        const newURL = $$(el).find("a").attr("href");
                        const $$$ = load(await (await this.request(newURL ?? "", {}, false)).text());

                        const currentData = zetroData.find((d) => d.volume === volume && d.illustrations);
                        if (currentData) {
                            currentData.data = $$$("div.entry-content_wrap div.reading-content").html() ?? "";
                        } else {
                            zetroData.push({
                                volume,
                                chapter,
                                part: "",
                                prologue: isPrologue,
                                illustrations: isIllustrations,
                                data: $$$("div.entry-content_wrap").html() ?? "",
                            });
                        }
                    }

                    if ((volume?.length > 0 && novelVolume?.length > 0 ? novelVolume === volume : true) && novelChapter === chapter && !isPrologue && !isIllustrations) {
                        const newURL = $$(el).find("a").attr("href");
                        const $$$ = load(await (await this.request(newURL ?? "", {}, false)).text());

                        const currentData = zetroData.find((d) => d.volume === volume && d.chapter === chapter);
                        if (currentData) {
                            currentData.data = $$$("div.entry-content_wrap div.reading-content").html() ?? "";
                        } else {
                            zetroData.push({
                                volume,
                                chapter,
                                part: "",
                                prologue: isPrologue,
                                illustrations: isIllustrations,
                                data: $$$("div.entry-content_wrap div.reading-content").html() ?? "",
                            });
                        }
                    }
                }

                const item = zetroData.find((d) => (novelVolume.length > 0 ? d.volume === novelVolume : true && novelChapter.length > 0 ? d.chapter === novelChapter : true && d.illustrations === novelIllustrations && d.prologue === novelPrologue));
                return item?.data ?? "";
            } else {
                return $("div.entry-content_wrap").html() ?? "";
            }
        } else if (url.includes("machineslicedbread")) {
            const $ = load(await (await this.request(url)).text());
            const newURL = $("div.entry-content a").first().attr("href");

            if (!newURL) return undefined;

            const data = await this.request(newURL ?? "", {}, false);

            const $$ = load(await data.text());
            return $$("div.entry-content").html() ?? "";
        } else if (url.includes("gakuseitranslations")) {
            const $ = load(await (await this.request(url)).text());
            if (url.split("/").length > 4) {
                const newURL = $("div.entry-content a")
                    .toArray()
                    .map((el) => {
                        if ($(el).attr("href")?.includes("gakuseitranslations") && !$(el).attr("href")?.includes("patreon")) {
                            console.log($(el).attr("href"));
                            return $(el).attr("href");
                        }
                    })[0];

                if (!newURL) return undefined;

                const data = await this.request(newURL ?? "", {}, false);
                const $$ = load(await data.text());
                return $$("div.entry-content").html() ?? "";
            } else {
                return $("div.entry-content").html() ?? "";
            }
        } else if (url.includes("one-fourthassed")) {
            const $ = load(await (await this.request(url)).text());
            const newURL = $("div#maia-main a.maia-button-primary").attr("href");

            if (!newURL) return undefined;

            const data = await this.request(newURL ?? "", {}, false);
            const $$ = load(await data.text());
            return $$("div.entry-content").html() ?? "";
        } else if (url.includes("kusomtl")) {
            if (url.split("/").length > 4) {
                const $ = load(await (await this.request(url)).text());
                const newURL = $("div.entry-content a").first().attr("href");

                if (!newURL) return undefined;

                const data = await this.request(newURL ?? "", {}, false);
                const $$ = load(await data.text());
                return $$("div.entry-content").html() ?? "";
            } else {
                const $ = load(await (await this.request(url)).text());
                return $("div.entry-content").html() ?? "";
            }
        } else if (url.includes("dasuitl")) {
            const $ = load(await (await this.request(url)).text());
            return $("article div.entry-content").html() ?? "";
        } else {
            try {
                const article = await extract(
                    url,
                    {},
                    {
                        headers: {
                            Cookie: "_ga=;",
                        },
                    },
                );
                return article?.content;
            } catch {
                return "Error extracting chapter content for " + url + ".";
            }
        }
    }
}
