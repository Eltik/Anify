import { load } from "cheerio";
import BaseProvider from ".";
import { Format, Genres, MediaStatus, Type } from "../../../types/enums";
import { AnimeInfo, MangaInfo } from "../../../types/types";

export default class NovelUpdatesBase extends BaseProvider {
    override id = "novelupdates";
    override url = "https://www.novelupdates.com";

    override formats: Format[] = [Format.NOVEL];

    public needsProxy: boolean = true;
    public overrideProxy: boolean = true;

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

    override async search(query: string, type: Type, formats: Format[], page: number): Promise<AnimeInfo[] | MangaInfo[] | undefined> {
        const results: MangaInfo[] = [];

        const searchData = await this.request(`${this.url}/series-finder/?sf=1&sh=${encodeURIComponent(query)}&nt=2443,26874,2444&ge=${this.genreMappings.ADULT}&sort=sread&order=desc${page ? `&pg=${page}` : ""}`, {
            method: "GET",
            headers: {
                Referer: this.url,
            },
        });

        const data = await searchData.text();

        const $ = load(data);

        const requestPromises: Promise<void>[] = [];

        $("div.search_main_box_nu").map((_, el) => {
            const id = $(el).find("div.search_body_nu div.search_title a").attr("href")?.split("/series/")[1].split("/")[0];

            requestPromises.push(
                this.getMedia(id!)
                    .then((response) => {
                        if (!response) return;
                        results.push(response as MangaInfo);
                    })
                    .catch((error) => {
                        console.error(`Error fetching data for ${id}: ${error}`);
                    }),
            );
        });

        await Promise.all(requestPromises);
        return results;
    }

    override async searchAdvanced(query: string, type: Type, formats: Format[], page: number, perPage: number, genres: Genres[] = [], genresExcluded: Genres[] = []): Promise<AnimeInfo[] | MangaInfo[] | undefined> {
        const results: MangaInfo[] = [];

        const genreNumbers = genres.map((genre) => this.genreMappings[genre.toUpperCase() as keyof typeof this.genreMappings]).filter((genreNumber) => genreNumber !== undefined);

        const excludedGenreNumbers = genresExcluded.map((genre) => this.genreMappings[genre.toUpperCase() as keyof typeof this.genreMappings]).filter((genreNumber) => genreNumber !== undefined);

        const searchData = await this.request(
            `${this.url}/series-finder/?sf=1&sh=${encodeURIComponent(query)}&nt=2443,26874,2444${genres.length > 0 ? `&gi=${genreNumbers.join(",")}` : ""}&ge=280${genresExcluded.length > 0 ? `,${excludedGenreNumbers.join(",")}` : ""}&sort=sread&order=desc${page ? `&pg=${page}` : ""}`,
            {
                method: "GET",
                headers: {
                    Referer: this.url,
                },
            },
        );

        const data = await searchData.text();

        const $ = load(data);

        const requestPromises: Promise<void>[] = [];

        $("div.search_main_box_nu").map((_, el) => {
            const id = $(el).find("div.search_body_nu div.search_title a").attr("href")?.split("/series/")[1].split("/")[0];

            requestPromises.push(
                this.getMedia(id!)
                    .then((response) => {
                        if (!response) return;
                        results.push(response as MangaInfo);
                    })
                    .catch((error) => {
                        console.error(`Error fetching data for ${id}: ${error}`);
                    }),
            );
        });

        await Promise.all(requestPromises);
        return results;
    }

    override async getMedia(id: string, retries = 0): Promise<AnimeInfo | MangaInfo | undefined> {
        if (retries >= 10) {
            console.error(`Failed to fetch data for ${id} after 10 retries.`);
            return undefined;
        }

        let data = await (await this.request(`${this.url}/series/${id}`, { headers: { Referer: this.url } })).text();
        let $$ = load(data);

        const title = $$("title").html();
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

            $$ = load(data);

            this.useGoogleTranslate = true;
        }
        if (title === "Just a moment..." || title === "Attention Required! | Cloudflare") {
            return this.getMedia(id, retries + 1);
        }

        const synonyms =
            $$("div#editassociated")
                .html()
                ?.split("<br>")
                .map((item) => item.trim()) ?? [];
        const year = Number($$("div#edityear").text()?.trim() ?? 0);

        return {
            id: id ?? "",
            artwork: [],
            bannerImage: null,
            characters: [],
            color: null,
            countryOfOrigin: $$("div#showlang a").text()?.trim() ?? null,
            coverImage: $$("div.seriesimg img").attr("src") ?? null,
            description: $$("div#editdescription").text()?.trim() ?? null,
            format: Format.NOVEL,
            genres: $$("div#seriesgenre a")
                .map((_, el) => $$(el).text())
                .get() as Genres[],
            popularity: Number($$("b.rlist").text()?.trim() ?? 0),
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
            type: Type.MANGA,
            year,
            author: $$("div#showauthors a").text(),
            publisher: $$("div#showopublisher a").text(),
        };
    }

    override async fetchSeasonal(): Promise<
        | {
              trending: AnimeInfo[] | MangaInfo[];
              seasonal: AnimeInfo[] | MangaInfo[];
              popular: AnimeInfo[] | MangaInfo[];
              top: AnimeInfo[] | MangaInfo[];
          }
        | undefined
    > {
        const promises = [
            this.fetchSeasonalData(`${this.url}/series-ranking/?rank=month&org=496&ge=280,4,281&rl=0`),
            this.fetchSeasonalData(`${this.url}/series-ranking/?rank=popmonth&org=496&ge=280,4,281&rl=0`),
            this.fetchSeasonalData(`${this.url}/series-ranking/?rank=popular&org=496&ge=280,4,281&rl=0`),
            this.fetchSeasonalData(`${this.url}/series-ranking/?rank=sixmonths&org=496&ge=280,4,281&rl=0`),
        ];

        const [trending, seasonal, popular, top] = await Promise.all(promises);

        return {
            trending: trending ?? [],
            seasonal: seasonal ?? [],
            popular: popular ?? [],
            top: top ?? [],
        };
    }

    private async fetchSeasonalData(url: string, retries = 0): Promise<AnimeInfo[] | MangaInfo[] | undefined> {
        if (retries >= 10) {
            console.error(`Failed to fetch seasonal data for ${url} after 10 retries.`);
            return undefined;
        }

        const results: MangaInfo[] = [];

        const searchData = await this.request(url, {
            method: "GET",
            headers: {
                Referer: this.url,
            },
        });

        const data = await searchData.text();

        const $ = load(data);

        const requestPromises: Promise<void>[] = [];

        const title = $("title").html();
        if (title === "Just a moment..." || title === "Attention Required! | Cloudflare") {
            return this.fetchSeasonalData(url, retries + 1);
        }

        $("div.search_main_box_nu").map((_, el) => {
            const id = $(el).find("div.search_body_nu div.search_title a").attr("href")?.split("/series/")[1].split("/")[0];

            if (!id) return;

            requestPromises.push(
                this.getMedia(id!)
                    .then((response) => {
                        if (!response) return;
                        results.push(response as MangaInfo);
                    })
                    .catch((error) => {
                        console.error(`Error fetching data for ${id}: ${error}`);
                    }),
            );
        });

        await Promise.all(requestPromises);
        return results;
    }
}
