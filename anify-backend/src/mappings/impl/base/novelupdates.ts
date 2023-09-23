import { load } from "cheerio";
import BaseProvider from ".";
import { Format, Formats, Genres, MediaStatus, Season, Type } from "../../../types/enums";
import { AnimeInfo, MangaInfo } from "../../../types/types";

export default class NovelUpdatesBase extends BaseProvider {
    override id = "novelupdates";
    override url = "https://www.novelupdates.com";

    override formats: Format[] = [Format.NOVEL];

    override async search(query: string, type: Type, formats: Format[], page: number, perPage: number): Promise<AnimeInfo[] | MangaInfo[] | undefined> {
        const results: AnimeInfo[] | MangaInfo[] = [];

        const searchData = await this.request(
            `${this.url}/series-finder/?sf=1&sh=${encodeURIComponent(query)}&nt=2443,26874,2444&ge=280&sort=sread&order=desc${page ? `&pg=${page}` : ""}`,
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

        const requestPromises: Promise<void>[] = [];

        $("div.search_main_box_nu").each((_, el) => {
            const id = $(el).find("div.search_body_nu div.search_title a").attr("href")?.split(this.url)[1]?.split("/series/")[1]?.slice(0, -1);

            requestPromises.push(
                this.request(`${this.url}/series/${id}`, { headers: { Cookie: "_ga=;" } }, true)
                    .then(async (response) => {
                        const secondReq = await response.text();
                        const $$ = load(secondReq);

                        const synonyms = $$("div#editassociated").html()?.split("<br>") ?? [];
                        const year = Number($$("div#edityear").text()?.trim() ?? 0);

                        results.push({
                            id: id ?? "",
                            artwork: [],
                            bannerImage: null,
                            characters: [],
                            color: null,
                            countryOfOrigin: $$("div#showlang a").text()?.trim() ?? null,
                            coverImage: $$("div.seriesimg img").attr("src") ?? null,
                            currentEpisode: null,
                            description: $$("div#editdescription").text()?.trim() ?? null,
                            duration: null,
                            format: Format.NOVEL,
                            genres: $$("div#seriesgenre a")
                                .map((_, el) => $$(el).text())
                                .get() as Genres[],
                            popularity: Number($$("b.rlist").text()?.trim() ?? 0) * 2,
                            rating: Number($$("h5.seriesother span.uvotes").text()?.split(" /")[0]?.substring(1) ?? 0) * 2,
                            relations: [],
                            season: Season.UNKNOWN,
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
                            trailer: null,
                            type: Type.MANGA,
                            year,
                        });
                    })
                    .catch((error) => {
                        console.error(`Error fetching data for ${id}: ${error}`);
                    }),
            );
        });

        await Promise.all(requestPromises);
        return results;
    }

    override async getMedia(id: string): Promise<AnimeInfo | MangaInfo | undefined> {
        const data = await (await this.request(`${this.url}/series/${id}`, { headers: { Cookie: "_ga=;" } }, true)).text();
        const $$ = load(data);

        const synonyms = $$("div#editassociated").html()?.split("<br>") ?? [];
        const year = Number($$("div#edityear").text()?.trim() ?? 0);

        return {
            id: id ?? "",
            artwork: [],
            bannerImage: null,
            characters: [],
            color: null,
            countryOfOrigin: $$("div#showlang a").text()?.trim() ?? null,
            coverImage: $$("div.seriesimg img").attr("src") ?? null,
            currentEpisode: null,
            description: $$("div#editdescription").text()?.trim() ?? null,
            duration: null,
            format: Format.NOVEL,
            genres: $$("div#seriesgenre a")
                .map((_, el) => $$(el).text())
                .get() as Genres[],
            popularity: Number($$("b.rlist").text()?.trim() ?? 0),
            rating: Number($$("h5.seriesother span.uvotes").text()?.split(" /")[0]?.substring(1) ?? 0),
            relations: [],
            season: Season.UNKNOWN,
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
            trailer: null,
            type: Type.MANGA,
            year,
        };
    }
}
