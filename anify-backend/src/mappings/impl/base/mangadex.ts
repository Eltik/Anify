import BaseProvider from ".";
import { Format, Formats, Genres, MediaStatus, Season, Type } from "../../../types/enums";
import { AnimeInfo, MangaInfo } from "../../../types/types";

export default class ManagDexBase extends BaseProvider {
    override id = "mangadex";
    override url = "https://mangadex.org";

    override formats: Format[] = [Format.MANGA, Format.ONE_SHOT];

    public needsProxy: boolean = true;

    private api = "https://api.mangadex.org";

    override async search(query: string, type: Type, formats: Format[], page: number, perPage: number): Promise<AnimeInfo[] | MangaInfo[] | undefined> {
        const results: MangaInfo[] = [];

        let mangaList: any[] = [];

        for (let page = 0; page <= 1; page += 1) {
            const uri = new URL("/manga", this.api);
            uri.searchParams.set("title", query);
            uri.searchParams.set("limit", !perPage || perPage === 0 ? "25" : String(perPage).toString());
            uri.searchParams.set("offset", String((!perPage || perPage === 0 ? 25 : perPage) * page).toString());
            uri.searchParams.set("order[relevance]", "desc");
            uri.searchParams.append("contentRating[]", "safe");
            uri.searchParams.append("contentRating[]", "suggestive");
            uri.searchParams.append("includes[]", "cover_art");

            const data = (await (await this.request(uri.href)).json()) as { data: any[] };

            mangaList = [...mangaList, ...data.data];
        }

        for (let i = 0; i < mangaList.length; i++) {
            const manga = mangaList[i];
            const attributes = manga.attributes;
            const relationships = manga.relationships;

            const altTitles: string[] = attributes.altTitles
                .map((title: { [key: string]: string }) => {
                    return Object.values(title)[0];
                })
                .concat(Object.values(attributes.title));

            const id = manga.id;
            let img = null;
            relationships.map((element: { id: string; type: string; related: string; attributes: { [key: string]: string } }) => {
                if (element.type === "cover_art") {
                    img = `${this.url}/covers/${id}/${element.id}.jpg.512.jpg`;
                }
            });

            const formatString: string = manga.type.toUpperCase();
            const format: Format = formatString === "ADAPTATION" ? Format.MANGA : Formats.includes(formatString as Format) ? (formatString as Format) : Format.MANGA;

            results.push({
                id,
                title: {
                    english: attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "en")?.en ?? attributes.title[Object.keys(attributes.title).filter((value) => value === "en")[0]] ?? null,
                    romaji:
                        attributes.title["ja-ro"] ??
                        attributes.title["jp-ro"] ??
                        attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "ja-ro")?.["ja-ro"] ??
                        attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "jp-ro")?.["jp-ro"] ??
                        null,
                    native:
                        attributes.title["jp"] ??
                        attributes.title["ja"] ??
                        attributes.title["ko"] ??
                        attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "jp")?.jp ??
                        attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "ja")?.ja ??
                        attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "ko")?.ko ??
                        null,
                },
                synonyms: altTitles,
                coverImage: img,
                format,
                year: attributes.year,
                artwork: [],
                bannerImage: null,
                characters: [],
                color: null,
                countryOfOrigin: attributes.publicationDemographic ?? attributes.originalLanguage?.toUpperCase() ?? null,
                description: attributes.description.en ?? Object.values(attributes.description)[0],
                genres: attributes.tags.filter((tag: any) => tag.attributes.group === "genre").map((tag: any) => tag.attributes.name.en),
                totalChapters: attributes.lastChapter ?? null,
                totalVolumes: attributes.lastVolume ?? null,
                status: attributes.status === "ongoing" ? MediaStatus.RELEASING : attributes.status === "completed" ? MediaStatus.FINISHED : null,
                tags: attributes.tags.filter((tag: any) => tag.attributes.group === "theme").map((tag: any) => tag.attributes.name.en),
                popularity: null,
                relations: [],
                rating: null,
                type: Type.MANGA,
                author: manga.relationships.filter((element: any) => element.type === "author").map((element: any) => element.attributes?.name) ?? null,
                publisher: manga.relationships.filter((element: any) => element.type === "publisher").map((element: any) => element.attributes?.name) ?? null,
            });
        }

        return results;
    }

    override async searchAdvanced(query: string, type: Type, formats: Format[], page: number, perPage: number, genres?: Genres[], genresExcluded?: Genres[], season?: Season, year: number = 0, tags: string[] = [], tagsExcluded: string[] = []): Promise<AnimeInfo[] | MangaInfo[] | undefined> {
        const results: MangaInfo[] = [];

        let mangaList: any[] = [];

        const genreList: { name: string; uid: string }[] = [];
        const tagList: { name: string; uid: string }[] = [];

        if ((Array.isArray(tags) && tags.length > 0) || (Array.isArray(tagsExcluded) && tagsExcluded.length > 0)) {
            const data = (await (await this.request(`${this.api}/manga/tag`)).json()) as any[];

            for (const item of data) {
                if (item.attributes?.group === "theme") {
                    genreList.push({
                        name: item.attributes?.name?.en,
                        uid: item.id,
                    });
                } else if (item.attributes?.group === "tag") {
                    tagList.push({
                        name: item.attributes?.name?.en,
                        uid: item.id,
                    });
                }
            }
        }

        for (let page = 0; page <= 1; page += 1) {
            const uri = new URL("/manga", this.api);
            uri.searchParams.set("title", query);
            uri.searchParams.set("limit", !perPage || perPage === 0 ? "25" : String(perPage).toString());
            uri.searchParams.set("offset", String((!perPage || perPage === 0 ? 25 : perPage) * page).toString());
            uri.searchParams.set("order[relevance]", "desc");
            uri.searchParams.append("contentRating[]", "safe");
            uri.searchParams.append("contentRating[]", "suggestive");
            uri.searchParams.append("includes[]", "cover_art");

            if (year) uri.searchParams.set("year", String(year));
            if (genres && genres.length > 0) {
                uri.searchParams.append(
                    "includedTags[]",
                    genres
                        .map((genre) => genreList.find((item) => item.name === genre)?.uid)
                        .filter((x) => x !== undefined)
                        .join(","),
                );
                uri.searchParams.set("includedTagsMode", "AND");
            }
            if (genresExcluded && genresExcluded.length > 0) {
                uri.searchParams.append(
                    "excludedTags[]",
                    genresExcluded
                        .map((genre) => genreList.find((item) => item.name === genre)?.uid)
                        .filter((x) => x !== undefined)
                        .join(","),
                );
                if (!uri.searchParams.get("includedTagsMode")) uri.searchParams.set("includedTagsMode", "AND");
            }
            if (tags && tags.length > 0) {
                uri.searchParams.append(
                    "includedTags[]",
                    tags
                        .map((tag) => tagList.find((item) => item.name === tag)?.uid)
                        .filter((x) => x !== undefined)
                        .join(","),
                );
                if (!uri.searchParams.get("includedTagsMode")) uri.searchParams.set("includedTagsMode", "AND");
            }
            if (tagsExcluded && tagsExcluded.length > 0) {
                uri.searchParams.append(
                    "excludedTags[]",
                    tagsExcluded
                        .map((tag) => tagList.find((item) => item.name === tag)?.uid)
                        .filter((x) => x !== undefined)
                        .join(","),
                );
                if (!uri.searchParams.get("includedTagsMode")) uri.searchParams.set("includedTagsMode", "AND");
            }

            const data = (await (await this.request(uri.href)).json()) as { data: any[] };

            mangaList = [...mangaList, ...data.data];
        }

        for (let i = 0; i < mangaList.length; i++) {
            const manga = mangaList[i];
            const attributes = manga.attributes;
            const relationships = manga.relationships;

            const altTitles: string[] = attributes.altTitles
                .map((title: { [key: string]: string }) => {
                    return Object.values(title)[0];
                })
                .concat(Object.values(attributes.title));

            const id = manga.id;
            let img = null;
            relationships.map((element: { id: string; type: string; related: string; attributes: { [key: string]: string } }) => {
                if (element.type === "cover_art") {
                    img = `${this.url}/covers/${id}/${element.id}.jpg.512.jpg`;
                }
            });

            const formatString: string = manga.type.toUpperCase();
            const format: Format = formatString === "ADAPTATION" ? Format.MANGA : Formats.includes(formatString as Format) ? (formatString as Format) : Format.MANGA;

            results.push({
                id,
                title: {
                    english: attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "en")?.en ?? attributes.title[Object.keys(attributes.title).filter((value) => value === "en")[0]] ?? null,
                    romaji:
                        attributes.title["ja-ro"] ??
                        attributes.title["jp-ro"] ??
                        attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "ja-ro")?.["ja-ro"] ??
                        attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "jp-ro")?.["jp-ro"] ??
                        null,
                    native:
                        attributes.title["jp"] ??
                        attributes.title["ja"] ??
                        attributes.title["ko"] ??
                        attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "jp")?.jp ??
                        attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "ja")?.ja ??
                        attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "ko")?.ko ??
                        null,
                },
                synonyms: altTitles,
                coverImage: img,
                format,
                year: attributes.year,
                artwork: [],
                bannerImage: null,
                characters: [],
                color: null,
                countryOfOrigin: attributes.publicationDemographic ?? attributes.originalLanguage?.toUpperCase() ?? null,
                description: attributes.description.en ?? Object.values(attributes.description)[0],
                genres: attributes.tags.filter((tag: any) => tag.attributes.group === "genre").map((tag: any) => tag.attributes.name.en),
                totalChapters: attributes.lastChapter ?? null,
                totalVolumes: attributes.lastVolume ?? null,
                status: attributes.status === "ongoing" ? MediaStatus.RELEASING : attributes.status === "completed" ? MediaStatus.FINISHED : null,
                tags: attributes.tags.filter((tag: any) => tag.attributes.group === "theme").map((tag: any) => tag.attributes.name.en),
                popularity: null,
                relations: [],
                rating: null,
                type: Type.MANGA,
                author: manga.relationships.filter((element: any) => element.type === "author").map((element: any) => element.attributes?.name) ?? null,
                publisher: manga.relationships.filter((element: any) => element.type === "publisher").map((element: any) => element.attributes?.name) ?? null,
            });
        }
        return results;
    }

    override async getMedia(id: string): Promise<AnimeInfo | MangaInfo | undefined> {
        try {
            const data = ((await (await this.request(`${this.api}/manga/${id}`)).json()) as { data: any }).data;
            const covers = (await (await this.request(`${this.api}/cover?limit=100&manga[]=${id}`)).json()) as { data: any[] };

            if (data.attributes.contentRating === "erotica" || data.attributes.contentRating === "pornographic") return undefined;

            const formatString: string = data.type.toUpperCase();
            const format: Format = formatString === "ADAPTATION" ? Format.MANGA : Formats.includes(formatString as Format) ? (formatString as Format) : Format.MANGA;

            if (!data.attributes) return undefined;

            return {
                id: id,
                type: Type.MANGA,
                title: {
                    english: data.attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "en")?.en ?? data.attributes.title[Object.keys(data.attributes.title).filter((value) => value === "en")[0]] ?? null,
                    romaji:
                        data.attributes.title["ja-ro"] ??
                        data.attributes.title["jp-ro"] ??
                        data.attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "ja-ro")?.["ja-ro"] ??
                        data.attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "jp-ro")?.["jp-ro"] ??
                        null,
                    native:
                        data.attributes.title["jp"] ??
                        data.attributes.title["ja"] ??
                        data.attributes.title["ko"] ??
                        data.attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "jp")?.jp ??
                        data.attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "ja")?.ja ??
                        data.attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "ko")?.ko ??
                        null,
                },
                synonyms: data.attributes.altTitles
                    .map((title: { [key: string]: string }) => {
                        return Object.values(title)[0];
                    })
                    .concat(Object.values(data.attributes.title)),
                description: data.attributes.description.en ?? data.attributes.description.jp ?? data.attributes.description.jp_ro ?? data.attributes.description.ko ?? Object.values(data.attributes.description)[0],
                countryOfOrigin: data.attributes.originalLanguage?.toUpperCase() ?? null,
                characters: [],
                genres: data.attributes.tags.filter((tag: any) => tag.attributes.group === "genre").map((tag: any) => tag.attributes.name.en),
                year: data.attributes.year,
                artwork: covers.data.map((cover: any) => {
                    const img = `${this.url}/covers/${id}/${cover.attributes.fileName}`;
                    const providerId = this.id;
                    const type = "poster";
                    return {
                        img,
                        providerId,
                        type,
                    };
                }),
                totalChapters: data.attributes.lastChapter ?? null,
                totalVolumes: data.attributes.lastVolume ?? null,
                status: data.attributes.status === "ongoing" ? MediaStatus.RELEASING : data.attributes.status === "completed" ? MediaStatus.FINISHED : null,
                color: null,
                popularity: null,
                relations: [],
                tags: data.attributes.tags.filter((tag: any) => tag.attributes.group === "theme").map((tag: any) => tag.attributes.name.en),
                rating: null,
                format,
                coverImage: `${this.url}/covers/${id}/${data.relationships.find((element: any) => element.type === "cover_art").id}.jpg`,
                bannerImage: null,
                author: data.relationships.filter((element: any) => element.type === "author").map((element: any) => element.attributes?.name) ?? null,
                publisher: data.relationships.filter((element: any) => element.type === "publisher").map((element: any) => element.attributes?.name) ?? null,
            };
        } catch (e) {
            return undefined;
        }
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
        // Format the date as YYYY-MM-DD
        const currentDate = new Date(Date.now());
        currentDate.setDate(currentDate.getDate() - 3);

        const year = currentDate.getFullYear();
        const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
        const day = currentDate.getDate().toString().padStart(2, "0");

        const createdAtParam = `${year}-${month}-${day}T00:00:00`;

        const trending = (await (await this.request(`${this.api}/manga?includes[]=cover_art&includes[]=artist&includes[]=author&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive&hasAvailableChapters=true&createdAtSince=${createdAtParam}`)).json().catch(() => {
            return {
                data: [],
            };
        })) as { data: any[] };
        const popular = (await (await this.request(`${this.api}/manga?includes[]=cover_art&includes[]=artist&includes[]=author&order[followedCount]=desc&contentRating[]=safe&contentRating[]=suggestive&hasAvailableChapters=true`)).json().catch(() => {
            return {
                data: [],
            };
        })) as { data: any[] };
        const top = (await (await this.request(`${this.api}/manga?includes[]=cover_art&includes[]=artist&includes[]=author&order[rating]=desc&contentRating[]=safe&contentRating[]=suggestive&hasAvailableChapters=true`)).json().catch(() => {
            return {
                data: [],
            };
        })) as { data: any[] };
        const seasonalReq = (await (await this.request(`${this.api}/list/1b9f88f8-9880-464d-9ed9-59b7e36392e2?includes[]=user`)).json().catch(() => {
            return {
                data: [],
            };
        })) as { data: any };

        const seasonalIDs: string[] = [];
        for (const item of seasonalReq.data.relationships) {
            if (item.type === "manga") {
                seasonalIDs.push(item.id);
            }
        }
        const seasonal = (await (await this.request(`${this.api}/manga?includes[]=cover_art&includes[]=artist&includes[]=author&ids[]=${seasonalIDs.join("&ids[]=")}`)).json().catch(() => {
            return {
                data: [],
            };
        })) as { data: any[] };

        const trendingList: MangaInfo[] = [];
        const popularList: MangaInfo[] = [];
        const topList: MangaInfo[] = [];
        const seasonalList: MangaInfo[] = [];

        for (const manga of trending?.data ?? []) {
            trendingList.push(this.returnFilledManga(manga));
        }

        for (const manga of popular?.data ?? []) {
            popularList.push(this.returnFilledManga(manga));
        }

        for (const manga of top?.data ?? []) {
            topList.push(this.returnFilledManga(manga));
        }

        for (const manga of seasonal?.data ?? []) {
            seasonalList.push(this.returnFilledManga(manga));
        }

        return {
            trending: trendingList,
            seasonal: seasonalList,
            popular: popularList,
            top: topList,
        };
    }

    override async fetchSchedule(): Promise<
        | {
              sunday: MangaInfo[] | AnimeInfo[];
              monday: MangaInfo[] | AnimeInfo[];
              tuesday: MangaInfo[] | AnimeInfo[];
              wednesday: MangaInfo[] | AnimeInfo[];
              thursday: MangaInfo[] | AnimeInfo[];
              friday: MangaInfo[] | AnimeInfo[];
              saturday: MangaInfo[] | AnimeInfo[];
          }
        | undefined
    > {
        return undefined;
    }

    override async fetchIds(): Promise<string[] | undefined> {
        const data = (await (await fetch("https://raw.githubusercontent.com/ArdaxHz/mangadex-id-map/main/json/manga_map.json")).json()) as { [key: string]: string };
        /*
        {
            "1": "c0ee660b-f9f2-45c3-8068-5123ff53f84a",
            "2": "7dbeaa0e-420a-4dc0-b2d3-eb174de266da",
            ...
        }
        */
        const ids: string[] = [];
        for (const id in data) {
            ids.push(String(data[id]));
        }

        return ids;
    }

    private returnFilledManga(manga: any): MangaInfo {
        const formatString: string = manga.type.toUpperCase();
        const format: Format = formatString === "ADAPTATION" ? Format.MANGA : Formats.includes(formatString as Format) ? (formatString as Format) : Format.MANGA;

        return {
            id: manga.id,
            type: Type.MANGA,
            title: {
                english: manga.attributes.title[Object.keys(manga.attributes.title).filter((value) => value === "en")[0]] ?? manga.attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "en")?.en ?? null,
                romaji:
                    manga.attributes.title["ja-ro"] ??
                    manga.attributes.title["jp-ro"] ??
                    manga.attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "ja-ro")?.["ja-ro"] ??
                    manga.attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "jp-ro")?.["jp-ro"] ??
                    null,
                native:
                    manga.attributes.title["jp"] ??
                    manga.attributes.title["ja"] ??
                    manga.attributes.title["ko"] ??
                    manga.attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "jp")?.jp ??
                    manga.attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "ja")?.ja ??
                    manga.attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "ko")?.ko ??
                    null,
            },
            synonyms: manga.attributes.altTitles.map((title: { [key: string]: string }) => {
                return Object.values(title)[0];
            }),
            description: manga.attributes.description.en ?? manga.attributes.description.jp ?? manga.attributes.description.jp_ro ?? manga.attributes.description.ko ?? Object.values(manga.attributes.description)[0],
            countryOfOrigin: manga.attributes.publicationDemographic ?? manga.attributes.originalLanguage?.toUpperCase() ?? null,
            characters: [],
            genres: manga.attributes.tags.filter((tag: any) => tag.attributes.group === "genre").map((tag: any) => tag.attributes.name.en),
            year: manga.attributes.year,
            artwork: [],
            totalChapters: manga.attributes.lastChapter ?? null,
            totalVolumes: manga.attributes.lastVolume ?? null,
            status: manga.attributes.status === "ongoing" ? MediaStatus.RELEASING : manga.attributes.status === "completed" ? MediaStatus.FINISHED : null,
            color: null,
            popularity: null,
            relations: [],
            tags: manga.attributes.tags.filter((tag: any) => tag.attributes.group === "theme").map((tag: any) => tag.attributes.name.en),
            rating: null,
            format,
            coverImage: `${this.url}/covers/${manga.id}/${manga.relationships.find((element: any) => element.type === "cover_art").id}.jpg`,
            bannerImage: null,
            author: manga.relationships.filter((element: any) => element.type === "author").map((element: any) => element.attributes?.name) ?? null,
            publisher: manga.relationships.filter((element: any) => element.type === "publisher").map((element: any) => element.attributes?.name) ?? null,
        };
    }
}
