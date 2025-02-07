import InformationProvider from "..";
import { MediaFormat, MediaSeason, MediaStatus, MediaType, ProviderType } from "../../../../types";
import type { IAnime } from "../../../../types/impl/database/impl/schema/anime";
import type { IManga } from "../../../../types/impl/database/impl/schema/manga";
import type { AnimeInfo, MangaInfo, MediaInfoKeys } from "../../../../types/impl/mappings/impl/mediaInfo";

export default class ComicKInfo extends InformationProvider<IAnime | IManga, AnimeInfo | MangaInfo> {
    override id = "comick";
    override url = "https://comick.cc";

    private api = "https://api.comick.fun";

    public needsProxy: boolean = true;
    public useGoogleTranslate: boolean = false;

    override rateLimit = 0;
    override maxConcurrentRequests: number = -1;

    override formats: MediaFormat[] = [MediaFormat.MANGA, MediaFormat.ONE_SHOT];

    override get priorityArea(): MediaInfoKeys[] {
        return ["coverImage", "description"];
    }

    override get sharedArea(): MediaInfoKeys[] {
        return ["synonyms", "genres", "artwork", "tags"];
    }

    override async info(media: IAnime | IManga): Promise<AnimeInfo | MangaInfo | undefined> {
        const comicKId = media.mappings.find((data) => {
            return data.providerId === "comick";
        })?.id;

        if (!comicKId) return undefined;

        const [comicReq, coverReq] = await Promise.all([
            this.request(`${this.api}/comic/${comicKId}`, {
                validateResponse: async (response) => {
                    if (!response.ok) return false;
                    try {
                        const data = (await response.json()) as { comic: IComic };
                        return data.comic !== undefined;
                    } catch {
                        return false;
                    }
                },
            }),
            this.request(`${this.api}/comic/${comicKId}/covers`, {
                validateResponse: async (response) => {
                    if (!response.ok) return false;
                    try {
                        const data = (await response.json()) as ICovers;
                        return data.md_covers !== undefined;
                    } catch {
                        return false;
                    }
                },
            }),
        ]);

        if (!comicReq.ok) return undefined;

        const [data, covers] = await Promise.all([comicReq.json().then((res) => (res as { comic: IComic }).comic), coverReq.json() as Promise<ICovers>]);

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
            format: MediaFormat.UNKNOWN,
            genres:
                data.md_comic_md_genres.map((genre) => {
                    return genre.md_genres.name;
                }) ?? [],
            popularity: Number(data.user_follow_count),
            rating: Number(data.bayesian_rating),
            relations: [],
            season: MediaSeason.UNKNOWN,
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
            author: null,
            publisher: null,
        } as MangaInfo;
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
                format: MediaFormat.MANGA,
                genres: [],
                id: "bd6d0982-0091-4945-ad70-c028ed3c0917",
                mappings: [
                    {
                        id: "mushoku-tensei-isekai-ittara-honki-dasu",
                        providerId: "comick",
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
                year: 2021,
                author: null,
                currentChapter: null,
                publisher: null,
            };

            const comicKId = media.mappings.find((data) => {
                return data.providerId === "comick";
            })?.id;

            if (!comicKId) return undefined;

            const [comicReq, coverReq] = await Promise.all([
                this.request(`${this.api}/comic/${comicKId}`, {
                    proxy: proxyURL,
                }),
                this.request(`${this.api}/comic/${comicKId}/covers`, {
                    proxy: proxyURL,
                }),
            ]);

            if (!comicReq.ok) return undefined;

            await Promise.all([comicReq.json().then((res) => (res as { comic: IComic }).comic), coverReq.json() as Promise<ICovers>]);

            return true;
        } catch {
            return false;
        }
    }
}

interface IComic {
    id: number;
    hid: string;
    title: string;
    country: string;
    status: number;
    links: {
        al: string;
        ap: string;
        bw: string;
        kt: string;
        mu: string;
        amz: string;
        cdj: string;
        ebj: string;
        mal: string;
        raw: string;
    };
    last_chapter: number;
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
    mismatch: boolean | null;
    year: number;
    bayesian_rating: string;
    rating_count: number;
    content_rating: string;
    translation_completed: boolean;
    relate_from: {
        relate_to: {
            slug: string;
            title: string;
        };
        md_relates: {
            name: string;
        };
    }[];
    md_titles: { title: string; lang?: string }[];
    md_comic_md_genres: { md_genres: { name: string; type: string | null; slug: string; group: string } }[];
    mu_comics: {
        licensed_in_english: boolean;
        mu_comic_categories: {
            mu_categories: { title: string; slug: string };
            positive_vote: number;
            negative_vote: number;
        }[];
    };
    md_covers: { vol: string; w: number; h: number; b2key: string }[];
    iso639_1: string;
    lang_name: string;
    lang_native: string;
}

interface ICovers {
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
