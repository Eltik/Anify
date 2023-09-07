import BaseProvider from ".";
import { Format, Genres, MediaStatus, Season, Type } from "../../../types/enums";
import { AnimeInfo, MangaInfo } from "../../../types/types";

export default class ComicKBase extends BaseProvider {
    override id = "comick";
    override url = "https://comick.app";

    override type: Type = Type.MANGA;
    override formats: Format[] = [Format.MANGA, Format.ONE_SHOT];

    // Docs: https://upload.comick.app/docs/static/index.html
    private api = "https://api.comick.fun";

    override async search(query: string, type: Type, formats: Format[], page: number, perPage: number): Promise<AnimeInfo[] | MangaInfo[] | undefined> {
        const data: SearchResult[] = await (await this.request(`${this.api}/v1.0/search?type=comic&q=${encodeURIComponent(query)}&limit=${perPage ?? 25}&page=${page && page > 0 ? page : 1}`, {}, true)).json();
        const genresReq: { id: number; name: string; slug: string; comic_count: number }[] = await (await this.request(`${this.api}/genre`, {}, true)).json();

        const results: AnimeInfo[] | MangaInfo[] = [];

        for (let i = 0; i < data.length; i++) {
            const result = data[i];

            let cover: any = result.md_covers ? result.md_covers[0] : null;
            if (cover && cover.b2key != undefined) {
                cover = "https://meo.comick.pictures/" + cover.b2key;
            }

            const genreList: string[] = result.genres
                .flatMap((genre) => {
                    return genresReq.map((genre2) => {
                        if (genre2.id === genre) {
                            return genre2.name;
                        }
                        return "";
                    });
                })
                .filter((genre) => genre !== "");

            results.push({
                id: result.slug,
                title: {
                    english: result.md_titles && result.md_titles.length > 0 ? result.md_titles[0].title : result.title ?? result.slug,
                    native: null,
                    romaji: result.title ?? result.slug,
                },
                countryOfOrigin: null,
                color: null,
                synonyms: result.md_titles ? result.md_titles.map((title) => title.title) : [],
                totalChapters: null,
                trailer: null,
                totalVolumes: null,
                currentEpisode: null,
                coverImage: cover,
                duration: null,
                format: formats[0],
                bannerImage: null,
                description: result.desc,
                genres: genreList as Genres[],
                type: type,
                year: result.year ?? 0,
                tags: [],
                popularity: result.follow_count,
                season: Season.UNKNOWN,
                rating: null,
                artwork: [],
                status: result.status === 1 ? MediaStatus.RELEASING : result.status === 2 ? MediaStatus.FINISHED : result.status === 3 ? MediaStatus.CANCELLED : result.status === 4 ? MediaStatus.HIATUS : MediaStatus.NOT_YET_RELEASED,
                characters: [],
                relations: [],
            });
        }

        return results;
    }

    override async searchAdvanced(query: string, type: Type, formats: Format[], page: number, perPage: number, genres?: Genres[], genresExcluded?: Genres[], year?: number, tags?: string[], tagsExcluded?: string[]): Promise<AnimeInfo[] | MangaInfo[] | undefined> {
        const data: SearchResult[] = await (await this.request(`${this.api}/v1.0/search?type=comic&q=${encodeURIComponent(query)}&limit=${perPage ?? 25}&page=${page ?? 1}${Array.isArray(genres) ? `&genres=${genres.map((genre) => genre.toLowerCase()).join(",")}` : ""}${Array.isArray(genresExcluded) ? `&excludes=${genresExcluded.map((genre) => genre.toLowerCase()).join(",")}` : ""}${Array.isArray(tags) ? `&tags=${tags.map((tag) => tag.toLowerCase()).join(",")}` : ""}${year && year != 0 ? `&from=${year}&to=${year}` : ""}`, {}, true)).json();
        const genresReq: { id: number; name: string; slug: string; comic_count: number }[] = await (await this.request(`${this.api}/genre`, {}, true)).json();

        const results: AnimeInfo[] | MangaInfo[] = [];

        for (let i = 0; i < data.length; i++) {
            const result = data[i];

            let cover: any = result.md_covers ? result.md_covers[0] : null;
            if (cover && cover.b2key != undefined) {
                cover = "https://meo.comick.pictures/" + cover.b2key;
            }

            const genreList: string[] = result.genres
                .flatMap((genre) => {
                    return genresReq.map((genre2) => {
                        if (genre2.id === genre) {
                            return genre2.name;
                        }
                        return "";
                    });
                })
                .filter((genre) => genre !== "");

            results.push({
                id: result.slug,
                title: {
                    english: result.md_titles ? result.md_titles[0].title : result.title ?? result.slug,
                    native: null,
                    romaji: null,
                },
                countryOfOrigin: null,
                color: null,
                synonyms: result.md_titles ? result.md_titles.map((title) => title.title) : [],
                totalChapters: null,
                trailer: null,
                totalVolumes: null,
                currentEpisode: null,
                coverImage: cover,
                duration: null,
                format: formats[0],
                bannerImage: null,
                description: result.desc,
                genres: genreList as Genres[],
                type: type,
                year: result.year ?? 0,
                tags: [],
                popularity: result.follow_count,
                season: Season.UNKNOWN,
                rating: null,
                artwork: [],
                status: result.status === 1 ? MediaStatus.RELEASING : result.status === 2 ? MediaStatus.FINISHED : result.status === 3 ? MediaStatus.CANCELLED : result.status === 4 ? MediaStatus.HIATUS : MediaStatus.NOT_YET_RELEASED,
                characters: [],
                relations: [],
            });
        }

        return results;
    }

    override async getMedia(id: string): Promise<AnimeInfo | MangaInfo | undefined> {
        const req = await this.request(`${this.api}/comic/${id}`, {}, true);

        if (!req.ok) return undefined;

        const coverReq = await this.request(`${this.api}/comic/${id}/covers`, {}, true);
        const covers: Covers = await coverReq.json();

        const data: Comic = (await req.json()).comic;

        return {
            id: String(data.slug),
            type: Type.MANGA,
            artwork: covers.md_covers.map((cover) => {
                return {
                    img: "https://meo.comick.pictures/" + cover.b2key,
                    type: "poster",
                    providerId: this.id,
                };
            }),
            bannerImage: null,
            characters: [],
            color: null,
            countryOfOrigin: data.country,
            coverImage:
                covers.md_covers.map((cover) => {
                    if (cover.is_primary) {
                        return `https://meo.comick.pictures/${cover.b2key}`;
                    }
                })[0] ??
                data.md_covers.map((cover) => `https://meo.comick.pictures/${cover.b2key}`)[0] ??
                null,
            currentEpisode: null,
            description: data.parsed,
            duration: null,
            format: Format.MANGA,
            genres:
                (data.md_comic_md_genres.map((genre) => {
                    return genre.md_genres.name;
                }) as Genres[]) ?? [],
            popularity: Number(data.user_follow_count),
            rating: Number(data.bayesian_rating),
            relations: [],
            season: Season.UNKNOWN,
            status: data.status === 1 ? MediaStatus.FINISHED : MediaStatus.RELEASING,
            synonyms: data.md_titles.map((title) => title.title),
            tags:
                data.mu_comics?.mu_comic_categories?.map((genre) => {
                    return genre.mu_categories.title;
                }) ?? [],
            title: {
                english: data.md_titles.find((title) => title.lang === "en")?.title ?? data.title,
                native: data.md_titles.find((title) => title.lang === "ja")?.title ?? null,
                romaji: data.md_titles.find((title) => title.lang === "ja-ro")?.title ?? null,
            },
            totalChapters: null,
            totalVolumes: null,
            trailer: null,
            year: data.year,
        };
    }
}

interface SearchResult {
    title: string;
    id: number;
    slug: string;
    year: number;
    rating: string;
    rating_count: number;
    follow_count: number;
    user_follow_count: number;
    content_rating: string;
    created_at: string;
    demographic: number;
    md_titles: { title: string }[];
    md_covers: { vol: any; w: number; h: number; b2key: string }[];
    highlight: string;
    desc: string;
    genres: number[];
    status: number;
}

interface Comic {
    id: number;
    hid: string;
    title: string;
    country: string;
    status: number;
    links: { al: string; ap: string; bw: string; kt: string; mu: string; amz: string; cdj: string; ebj: string; mal: string; raw: string };
    last_chapter: any;
    chapter_count: number;
    demographic: number;
    hentai: boolean;
    user_follow_count: number;
    follow_rank: number;
    comment_count: number;
    follow_count: number;
    desc: string;
    parsed: string;
    slug: string;
    mismatch: any;
    year: number;
    bayesian_rating: any;
    rating_count: number;
    content_rating: string;
    translation_completed: boolean;
    relate_from: Array<any>;
    mies: any;
    md_titles: { title: string; lang?: string }[];
    md_comic_md_genres: { md_genres: { name: string; type: string | null; slug: string; group: string } }[];
    mu_comics: {
        licensed_in_english: any;
        mu_comic_categories: {
            mu_categories: { title: string; slug: string };
            positive_vote: number;
            negative_vote: number;
        }[];
    };
    md_covers: { vol: any; w: number; h: number; b2key: string }[];
    iso639_1: string;
    lang_name: string;
    lang_native: string;
}

interface Covers {
    id: number;
    title: string;
    slug: string;
    links2: {
        id: string;
        slug: string;
        enable: boolean;
    }[];
    noindex: boolean;
    country: string;
    md_covers: {
        id: number;
        w: number;
        h: number;
        s: number;
        gpurl: string;
        md_comic_id: number;
        url: string;
        vol: string;
        mdid: string | null;
        b2key: string;
        is_primary: boolean;
        locale: string | boolean;
    }[];
}
