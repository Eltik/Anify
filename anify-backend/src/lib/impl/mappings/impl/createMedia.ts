import { ANIME_PROVIDERS, INFORMATION_PROVIDERS, MANGA_PROVIDERS, META_PROVIDERS } from "../../../../mappings";
import type InformationProvider from "../../../../mappings/impl/information";
import { MediaFormat, MediaSeason, MediaType, ProviderType } from "../../../../types";
import type { IAnime } from "../../../../types/impl/database/impl/schema/anime";
import type { IManga } from "../../../../types/impl/database/impl/schema/manga";
import type { IMappedResult } from "../../../../types/impl/lib/impl/mappings";
import type { IMedia } from "../../../../types/impl/mappings";
import colors from "colors";
import type { AnimeInfo, MangaInfo } from "../../../../types/impl/mappings/impl/mediaInfo";
import { averageMetric } from "./helper/averageMetric";

/**
 * @description Creates a media object and fetches information from information providers.
 * @param mappings Mapped results from the map() function
 * @param type Type of media
 * @returns Promise<Anime[] | Manga[]>
 */
export async function createMedia(mappings: IMappedResult[], type: MediaType): Promise<IMedia[]> {
    const results = [];

    for (const mapping of mappings) {
        let hasPushed = false;
        const metaProviders = await META_PROVIDERS.map(async (prov) => await prov());
        const animeProviders = await ANIME_PROVIDERS.map(async (prov) => await prov());
        const mangaProviders = await MANGA_PROVIDERS.map(async (prov) => await prov());

        const provider = await Promise.all([...metaProviders, ...animeProviders, ...mangaProviders]).then((providers) => providers.find((p) => p.id === mapping.data.providerId));

        for (const result of results) {
            if (result.id === mapping.id) {
                hasPushed = true;

                const toPush = {
                    id: mapping.data.id,
                    providerId: mapping.data.providerId,
                    providerType: provider?.providerType ?? ProviderType.ANIME,
                    similarity: mapping.similarity,
                };

                result.mappings.push(toPush);
            }
        }

        if (!hasPushed) {
            if (type === MediaType.ANIME) {
                const anime: IAnime = {
                    id: mapping.id,
                    slug: mapping.slug,
                    coverImage: "",
                    bannerImage: "",
                    trailer: "",
                    status: null,
                    type: MediaType.ANIME,
                    season: MediaSeason.UNKNOWN,
                    title: {
                        romaji: null,
                        english: null,
                        native: null,
                    },
                    currentEpisode: null,
                    mappings: [
                        {
                            id: mapping.data.id,
                            providerId: mapping.data.providerId,
                            providerType: ProviderType.ANIME,
                            similarity: mapping.similarity,
                        },
                    ],
                    synonyms: [],
                    countryOfOrigin: null,
                    description: null,
                    duration: null,
                    color: null,
                    year: null,
                    rating: null,
                    popularity: null,
                    genres: [],
                    format: MediaFormat.UNKNOWN,
                    relations: [],
                    totalEpisodes: 0,
                    episodes: {
                        latest: {
                            updatedAt: new Date(Date.now()).getTime(),
                            latestEpisode: 0,
                            latestTitle: "",
                        },
                        data: [],
                    },
                    tags: [],
                    artwork: [],
                    characters: [],
                    averagePopularity: 0,
                    averageRating: 0,
                    createdAt: new Date(Date.now()),
                };

                results.push(anime);
            } else {
                const manga: IManga = {
                    id: mapping.id,
                    slug: mapping.slug,
                    coverImage: "",
                    bannerImage: "",
                    status: null,
                    type: MediaType.MANGA,
                    title: {
                        romaji: null,
                        english: null,
                        native: null,
                    },
                    mappings: [
                        {
                            id: mapping.data.id,
                            providerId: mapping.data.providerId,
                            providerType: ProviderType.MANGA,
                            similarity: mapping.similarity,
                        },
                    ],
                    synonyms: [],
                    countryOfOrigin: null,
                    description: null,
                    color: null,
                    year: null,
                    rating: null,
                    popularity: null,
                    genres: [],
                    format: MediaFormat.UNKNOWN,
                    relations: [],
                    currentChapter: null,
                    totalChapters: 0,
                    totalVolumes: 0,
                    chapters: {
                        latest: {
                            updatedAt: new Date(Date.now()).getTime(),
                            latestChapter: 0,
                            latestTitle: "",
                        },
                        data: [],
                    },
                    tags: [],
                    artwork: [],
                    characters: [],
                    author: null,
                    publisher: null,
                    averagePopularity: 0,
                    averageRating: 0,
                    createdAt: new Date(Date.now()),
                };

                results.push(manga);
            }
        }
    }

    for (let i = 0; i < results.length; i++) {
        const media = results[i];

        for (let j = 0; j < INFORMATION_PROVIDERS.length; j++) {
            const provider = (await INFORMATION_PROVIDERS[j]()) as InformationProvider<IMedia, AnimeInfo | MangaInfo>;
            // Fetch info baesd on the media
            const info = await provider.info(media).catch((err) => {
                console.log(colors.red(`Error while fetching info for ${media.id} from ${provider.id}`));
                console.error(err);
                return null;
            });

            if (!info) {
                continue;
            }

            // Fill the media object with all necessary info
            fillMediaInfo(media, info, provider);
        }
    }

    return results;
}

/**
 * @description Fills the media object with all necessary info.
 * @param media Media object
 * @param info Media info object
 * @param provider Information provider
 * @returns
 */
export function fillMediaInfo<T extends IAnime | IManga, U extends AnimeInfo | MangaInfo>(media: T, info: U, provider: InformationProvider<T, U>): T {
    try {
        // Fields that need to be cross loaded. For example, rating which contains Kitsu, AniList, and MAL fields.
        const crossLoadFields: (keyof AnimeInfo | MangaInfo)[] = ["popularity", "rating"];

        // Special fields that are handled differently than others.
        const specialLoadFields: (keyof AnimeInfo | MangaInfo)[] = ["title"];

        for (const ak of Object.keys(info)) {
            if (crossLoadFields.includes(ak as keyof (AnimeInfo | MangaInfo)) || provider.sharedArea.includes(ak as keyof (AnimeInfo | MangaInfo)) || specialLoadFields.includes(ak as keyof (AnimeInfo | MangaInfo))) continue;

            const v = media[ak as keyof (IAnime | IManga)];

            let write = false;
            if ((!v || v === "UNKNOWN") && !!info[ak as keyof (AnimeInfo | MangaInfo)] && info[ak as keyof (AnimeInfo | MangaInfo)] !== "UNKNOWN") {
                write = true;
            } else {
                if (provider.priorityArea.includes(ak as keyof (AnimeInfo | MangaInfo)) && !!info[ak as keyof (AnimeInfo | MangaInfo)]) write = true;
            }

            if (write) {
                // Use type assertion to indicate that ak is of type keyof (Anime | Manga)
                (media[ak as keyof (IAnime | IManga)] as unknown) = info[ak as keyof (AnimeInfo | MangaInfo)];
            }
        }

        for (const special of specialLoadFields) {
            const v = info[special as keyof (AnimeInfo | MangaInfo)];
            if (v) {
                // ak is the english/romaji/native title
                // av is the actual title
                for (const [ak, av] of Object.entries(v)) {
                    if (av && (av as keyof (AnimeInfo | MangaInfo))?.length) {
                        if (!((media[special as keyof (IAnime | IManga)] as Record<string, unknown>)[ak])) {
                            (media[special as keyof (IAnime | IManga)] as Record<string, unknown>)[ak] = {};

                            Object.assign(media[special as keyof (IAnime | IManga)] ?? {}, {
                                [ak]: av,
                            });
                        }
                    }
                }
            }
        }

        for (const shared of provider.sharedArea) {
            if (!media[shared as keyof (IAnime | IManga)]) {
                (media[shared as keyof (IAnime | IManga)] as unknown) = [];
            }

            // @ts-expect-error: Type assertion is not working
            (media[shared as keyof (IAnime | IManga)] as unknown) = [...new Set((media[shared as keyof (IAnime | IManga)]).concat(info[shared as keyof (AnimeInfo | MangaInfo)] ?? []))];
        }

        for (const crossLoad of crossLoadFields) {
            if (info[crossLoad as keyof (AnimeInfo | MangaInfo)]) {
                if (media[crossLoad as keyof (IAnime | IManga)] === null || media[crossLoad as keyof (IAnime | IManga)] === undefined) {
                    (media[crossLoad as keyof (IAnime | IManga)] as unknown) = {};

                    Object.assign(media[crossLoad as keyof (IAnime | IManga)] ?? {}, {
                        [provider.id]: info[crossLoad as keyof (AnimeInfo | MangaInfo)],
                    });
                }
                if (media[crossLoad as keyof (IAnime | IManga)] !== null && media[crossLoad as keyof (IAnime | IManga)] !== undefined) {
                    if (media[crossLoad as keyof (IAnime | IManga)]) {
                        ((media[crossLoad as keyof (IAnime | IManga)] as Record<string, unknown>))[provider.id] = info[crossLoad as keyof (AnimeInfo | MangaInfo)];
                    }
                }
            }
        }

        // Set averagePopularity and averageRating
        if (media.rating) {
            const averageRating = averageMetric(media.rating);
            media.averageRating = averageRating;
        }
        if (media.popularity) {
            const averagePopularity = averageMetric(media.popularity);
            media.averagePopularity = averagePopularity;
        }

        return media;
    } catch (e) {
        console.log(colors.red(`Error while filling media info for ${media.id} with provider ${provider.id}`));
        console.error(e);
        return media;
    }
}
