import { load } from "cheerio";
import InformationProvider from "..";
import { MediaFormat, MediaStatus, MediaType, ProviderType } from "../../../../types";
import type { IAnime } from "../../../../types/impl/database/impl/schema/anime";
import type { IManga } from "../../../../types/impl/database/impl/schema/manga";
import type { AnimeInfo, MangaInfo, MediaInfoKeys } from "../../../../types/impl/mappings/impl/mediaInfo";

export default class NovelUpdatesInfo extends InformationProvider<IAnime | IManga, AnimeInfo | MangaInfo> {
    override id = "novelupdates";
    override url = "https://www.novelupdates.com";

    public needsProxy: boolean = true;
    public useGoogleTranslate: boolean = false;

    override rateLimit = 0;
    override maxConcurrentRequests: number = -1;

    override formats: MediaFormat[] = [MediaFormat.NOVEL];

    override get priorityArea(): MediaInfoKeys[] {
        return [];
    }

    override get sharedArea(): MediaInfoKeys[] {
        return ["synonyms", "genres", "tags"];
    }

    override async info(media: IAnime | IManga, retries = 0): Promise<AnimeInfo | MangaInfo | undefined> {
        if (retries >= 5) return undefined;

        const novelUpdatesId = media.mappings.find((data) => {
            return data.providerId === "novelupdates";
        })?.id;

        if (!novelUpdatesId) return undefined;

        const data = await (
            await this.request(`${this.url}/series/${novelUpdatesId}`, {
                headers: {
                    Cookie: "_ga=;",
                    "User-Agent": "Mozilla/5.0",
                },
                validateResponse: async (response) => {
                    if (!response.ok) return false;
                    try {
                        const data = (await response.text()) as string;
                        const $ = load(data);
                        return $("div.seriesimg").length > 0;
                    } catch {
                        return false;
                    }
                },
            })
        ).text();
        const $$ = load(data);

        if (data.trim().includes("Not authenticated or invalid authentication credentials. Make sure to update your proxy address, proxy username and port.") || data.trim().includes("HTTP authorization error: ip auth failed, no credentials provided")) {
            return this.info(media, retries + 1);
        }

        const title = $$("title").html();
        if (!title || title === "ERROR: The requested URL could not be retrieved" || title === "Internet Security by Zscaler" || title === "400 Bad Request" || title === "Error 404 (Not Found)!!1" || title === "Just a moment..." || title === "Attention Required! | Cloudflare") {
            return this.info(media, retries + 1);
        }

        const synonyms =
            $$("div#editassociated")
                .html()
                ?.split("<br>")
                .map((item) => item.trim()) ?? [];
        const year = Number($$("div#edityear").text()?.trim() ?? 0);

        return {
            id: novelUpdatesId ?? "",
            artwork: [],
            bannerImage: null,
            characters: [],
            color: null,
            countryOfOrigin: $$("div#showlang a").text()?.trim() ?? null,
            coverImage: $$("div.seriesimg img").attr("src") ?? null,
            description: $$("div#editdescription").text()?.trim() ?? null,
            format: MediaFormat.NOVEL,
            genres: $$("div#seriesgenre a")
                .map((_, el) => $$(el).text())
                .get(),
            popularity: Number($$("b.rlist").text()?.trim() ?? 0) * 2,
            rating: Number($$("h5.seriesother span.uvotes").text()?.split(" /")[0]?.substring(1) ?? 0) * 2,
            relations: [],
            status: $$("div#editstatus").text()?.includes("Complete") ? MediaStatus.FINISHED : MediaStatus.RELEASING,
            synonyms,
            tags: $$("div#showtags a")
                .map((_, el) => $$(el).text())
                .get(),
            title: {
                english: $$("div.seriestitlenu").text()?.trim() ?? null,
                native: $$("div#editassociated").html()?.split("<br>")[($$("div#editassociated").html()?.split("<br>") ?? []).length - 1]?.trim() ?? null,
                romaji: $$("div#editassociated").html()?.split("<br>")[0]?.trim() ?? null,
            },
            totalChapters: isNaN(Number($$("div#editstatus").text()?.split(" / ")[1]?.split(" Chapters")[0]?.trim())) ? null : Number($$("div#editstatus").text()?.split(" / ")[1]?.split(" Chapters")[0]?.trim()),
            totalVolumes: isNaN(Number($$("div#editstatus").text()?.split(" / ")[0].split(" Volumes")[0]?.trim())) ? null : Number($$("div#editstatus").text()?.split(" / ")[0].split(" Volumes")[0]?.trim()),
            type: MediaType.MANGA,
            year,
            publisher: $$("div#showopublisher a").text(),
            author: $$("div#showauthors a").text(),
        };
    }

    override async proxyCheck(proxyURL: string): Promise<boolean | undefined> {
        try {
            const media = {
                artwork: [],
                averagePopularity: null,
                averageRating: null,
                bannerImage: null,
                characters: [],
                color: null,
                coverImage: null,
                countryOfOrigin: null,
                createdAt: new Date(Date.now()),
                description: null,
                chapters: {
                    data: [],
                    latest: {
                        latestChapter: 0,
                        latestTitle: "",
                        updatedAt: 0,
                    },
                },
                format: MediaFormat.NOVEL,
                genres: [],
                id: "mushoku-tensei",
                mappings: [
                    {
                        id: "mushoku-tensei",
                        providerId: "novelupdates",
                        providerType: ProviderType.META,
                        similarity: 1,
                    },
                ],
                popularity: null,
                rating: null,
                relations: [],
                slug: "mushoku-tensei-isekai-ittara-honki-dasu",
                status: null,
                synonyms: [],
                tags: [],
                title: {
                    english: "Mushoku Tensei: Jobless Reincarnation",
                    native: "無職転生 ～異世界行ったら本気だす～",
                    romaji: "Mushoku Tensei: Isekai Ittara Honki Dasu",
                },
                totalChapters: 0,
                totalVolumes: 0,
                type: MediaType.MANGA,
                year: 2012,
                author: null,
                currentChapter: null,
                publisher: null,
            };

            const novelUpdatesId = media.mappings.find((data) => {
                return data.providerId === "novelupdates";
            })?.id;

            if (!novelUpdatesId) return undefined;

            const data = await (
                await this.request(`${this.url}/series/${novelUpdatesId}`, {
                    proxy: proxyURL,
                    headers: {
                        Cookie: "_ga=;",
                        "User-Agent": "Mozilla/5.0",
                    },
                })
            ).text();
            const $$ = load(data);

            if (data.trim().includes("Not authenticated or invalid authentication credentials. Make sure to update your proxy address, proxy username and port.") || data.trim().includes("HTTP authorization error: ip auth failed, no credentials provided")) {
                return false;
            }

            const title = $$("title").html();
            if (!title || title === "Error 404 (Not Found)!!1" || title === "Just a moment..." || title === "Attention Required! | Cloudflare") {
                return false;
            }

            const novelTitle = {
                english: $$("div.seriestitlenu").text()?.trim() ?? null,
                native: $$("div#editassociated").html()?.split("<br>")[($$("div#editassociated").html()?.split("<br>") ?? []).length - 1]?.trim() ?? null,
                romaji: $$("div#editassociated").html()?.split("<br>")[0]?.trim() ?? null,
            };

            if ((!novelTitle.english || novelTitle.english.length === 0) && (!novelTitle.native || novelTitle.native.length === 0) && (!novelTitle.romaji || novelTitle.romaji.length === 0)) {
                return false;
            }

            return true;
        } catch {
            return false;
        }
    }
}
