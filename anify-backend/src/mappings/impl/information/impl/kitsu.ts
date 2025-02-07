import InformationProvider from "..";
import { MediaFormat, MediaSeason, MediaType, ProviderType } from "../../../../types";
import type { IArtwork } from "../../../../types/impl/database/impl/mappings";
import type { IAnime } from "../../../../types/impl/database/impl/schema/anime";
import type { IManga } from "../../../../types/impl/database/impl/schema/manga";
import type { AnimeInfo, MangaInfo, MediaInfoKeys } from "../../../../types/impl/mappings/impl/mediaInfo";

export default class KitsuInformation extends InformationProvider<IAnime | IManga, AnimeInfo | MangaInfo> {
    override id = "kitsu";
    override url = "https://kitsu.io";

    private kitsuApiUrl = "https://kitsu.io/api/edge";

    public needsProxy: boolean = true;
    public useGoogleTranslate: boolean = false;

    override rateLimit = 0;
    override maxConcurrentRequests: number = -1;

    override formats: MediaFormat[] = [MediaFormat.TV, MediaFormat.MOVIE, MediaFormat.ONA, MediaFormat.SPECIAL, MediaFormat.TV_SHORT, MediaFormat.OVA, MediaFormat.MANGA, MediaFormat.ONE_SHOT, MediaFormat.NOVEL];

    override get priorityArea(): MediaInfoKeys[] {
        return ["coverImage"];
    }

    override get sharedArea(): MediaInfoKeys[] {
        return ["synonyms", "genres", "artwork"];
    }

    override async info(media: IAnime | IManga): Promise<AnimeInfo | MangaInfo | undefined> {
        const kitsuId = media.mappings.find((data) => {
            return data.providerId === "kitsu";
        })?.id;

        if (!kitsuId) return undefined;

        try {
            const kitsuResponse: KitsuResponse = (await (
                await this.request(`${this.kitsuApiUrl}/${media.type.toLowerCase()}/${kitsuId}`, {
                    validateResponse: async (response) => {
                        if (!response.ok) return false;
                        try {
                            const data = (await response.json()) as KitsuResponse;
                            return data.data !== undefined;
                        } catch {
                            return false;
                        }
                    },
                })
            ).json()) as KitsuResponse;

            const attributes = kitsuResponse?.data?.attributes;

            if (!attributes) return undefined;

            const kitsuGenre = (await (
                await this.request(`${this.kitsuApiUrl}/${media.type.toLowerCase()}/${kitsuId}/genres`, {
                    validateResponse: async (response) => {
                        if (!response.ok) return false;
                        try {
                            const data = (await response.json()) as { data: { attributes: { name: string } }[] };
                            return data.data !== undefined;
                        } catch {
                            return false;
                        }
                    },
                })
            ).json()) as { data: { attributes: { name: string } }[] };
            const genres = kitsuGenre?.data;

            const artwork: IArtwork[] = [];

            if (attributes.coverImage?.original)
                artwork.push({
                    type: "banner",
                    img: attributes.coverImage.original,
                    providerId: this.id,
                });
            if (attributes.posterImage?.original)
                artwork.push({
                    type: "poster",
                    img: attributes.posterImage.original,
                    providerId: this.id,
                });

            return {
                id: kitsuId,
                title: {
                    english: attributes.titles.en ?? null,
                    romaji: attributes.titles.en_jp ?? null,
                    native: attributes.titles.ja_jp ?? null,
                },
                currentEpisode: null,
                trailer: null,
                duration: attributes.episodeLength ?? null,
                color: null,
                bannerImage: attributes.coverImage?.original ?? null,
                coverImage: attributes.posterImage?.original ?? null,
                status: null,
                format: MediaFormat.UNKNOWN,
                season: MediaSeason.UNKNOWN,
                synonyms: [],
                description: attributes.synopsis ?? null,
                year: null,
                totalEpisodes: attributes.episodeCount ?? 0,
                genres: genres ? genres.map((genre) => genre.attributes.name) : [],
                rating: attributes.averageRating ? Number.parseFloat((Number.parseFloat(attributes.averageRating) / 10).toFixed(2)) : null,
                popularity: null,
                countryOfOrigin: null,
                tags: [],
                relations: [],
                artwork,
                characters: [],
                totalChapters: null,
                totalVolumes: null,
                type: media.type,
            } as AnimeInfo | MangaInfo;
        } catch {
            return undefined;
        }
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
                currentEpisode: 0,
                duration: null,
                episodes: {
                    data: [],
                    latest: {
                        latestEpisode: 0,
                        latestTitle: "",
                        updatedAt: 0,
                    },
                },
                format: MediaFormat.TV,
                genres: [],
                id: "108465",
                mappings: [
                    {
                        id: "42323",
                        providerId: "kitsu",
                        providerType: ProviderType.META,
                        similarity: 1,
                    },
                ],
                popularity: null,
                rating: null,
                relations: [],
                season: MediaSeason.UNKNOWN,
                slug: "mushoku-tensei-isekai-ittara-honki-dasu",
                status: null,
                synonyms: [],
                tags: [],
                title: {
                    english: "Mushoku Tensei: Jobless Reincarnation",
                    native: "無職転生 ～異世界行ったら本気だす～",
                    romaji: "Mushoku Tensei: Isekai Ittara Honki Dasu",
                },
                totalEpisodes: 0,
                trailer: null,
                type: MediaType.ANIME,
                year: 2021,
            };

            const kitsuId = media.mappings.find((data) => {
                return data.providerId === "kitsu";
            })?.id;

            if (!kitsuId) return undefined;

            try {
                const kitsuResponse: KitsuResponse = (await (
                    await this.request(`${this.kitsuApiUrl}/${media.type.toLowerCase()}/${kitsuId}`, {
                        proxy: proxyURL,
                    })
                ).json()) as KitsuResponse;

                const attributes = kitsuResponse?.data?.attributes;

                if (!attributes) return false;

                (await (
                    await this.request(`${this.kitsuApiUrl}/${media.type.toLowerCase()}/${kitsuId}/genres`, {
                        proxy: proxyURL,
                    })
                ).json()) as { data: { attributes: { name: string } }[] };

                const artwork: IArtwork[] = [];

                if (attributes.coverImage?.original)
                    artwork.push({
                        type: "banner",
                        img: attributes.coverImage.original,
                        providerId: this.id,
                    });
                if (attributes.posterImage?.original)
                    artwork.push({
                        type: "poster",
                        img: attributes.posterImage.original,
                        providerId: this.id,
                    });

                return true;
            } catch {
                return false;
            }
        } catch {
            return false;
        }
    }
}

type KitsuResponse = {
    data: {
        attributes: {
            titles: {
                en: string | null;
                en_jp: string | null;
                ja_jp: string | null;
            };
            description: string | null;
            subtype: string;
            status: string;
            showType: string;
            synopsis: string | null;
            episodeLength: number | null;
            posterImage: {
                original: string | null;
            };
            coverImage: {
                original: string | null;
            };
            averageRating: string | null;
            episodeCount: number | null;
        };
    };
};
