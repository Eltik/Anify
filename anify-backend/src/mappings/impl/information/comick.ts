import InformationProvider from ".";
import { Format, Genres, MediaStatus, Season } from "../../../types/enums";
import { Anime, AnimeInfo, Manga, MangaInfo, MediaInfoKeys } from "../../../types/types";

export default class ComicKInfo extends InformationProvider<Anime | Manga, AnimeInfo | MangaInfo> {
    override id = "comick";
    override url = "https://comick.app";

    private api = "https://api.comick.fun";

    override get priorityArea(): MediaInfoKeys[] {
        return ["coverImage", "description"];
    }

    override get sharedArea(): MediaInfoKeys[] {
        return ["synonyms", "genres", "artwork", "tags"];
    }

    override async info(media: Anime | Manga): Promise<AnimeInfo | MangaInfo | undefined> {
        const comicKId = media.mappings.find((data) => {
            return data.providerId === "comick";
        })?.id;

        if (!comicKId) return undefined;

        const req = await this.request(`${this.api}/comic/${comicKId}`, {}, true);

        if (!req.ok) return undefined;

        const coverReq = await this.request(`${this.api}/comic/${comicKId}/covers`, {}, true);
        const covers: Covers = await coverReq.json();

        const data: Comic = (await req.json()).comic;

        return {
            id: String(data.slug),
            type: media.type,
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
            format: Format.UNKNOWN,
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
