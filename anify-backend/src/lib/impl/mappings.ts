import colors from "colors";
import { get } from "../../database/impl/fetch/get";
import emitter, { Events } from "..";
import { Anime, AnimeInfo, Manga, MangaInfo, Result } from "../../types/types";
import { Format, MediaStatus, ProviderType, Season, Type } from "../../types/enums";
import { ANIME_PROVIDERS, BASE_PROVIDERS, INFORMATION_PROVIDERS, MANGA_PROVIDERS, META_PROVIDERS, animeProviders, infoProviders, mangaProviders, metaProviders } from "../../mappings";
import { clean, slugify } from "../../helper/title";
import { findBestMatch2DArray, similarity } from "../../helper/stringSimilarity";
import { averageMetric, isString } from "../../helper";
import InformationProvider from "../../mappings/impl/information";

/**
 * @description Maps media to base providers and fetches info from a variety of websites.
 * @param data The data to load the mapping for.
 * @returns Promise<Anime[] | Manga[]>
 */
export const loadMapping = async (data: { id: string; type: Type; formats: Format[] }): Promise<Anime[] | Manga[]> => {
    try {
        // First check if exists in database
        const existing = await get(data.id);

        if (existing) {
            // If it does, emit the event and return
            await emitter.emitAsync(Events.COMPLETED_MAPPING_LOAD, [existing]);
            return [existing] as Anime[] | Manga[];
        }
    } catch (e) {
        console.error(e);
        console.log(colors.red("Error while fetching from database."));
    }

    console.log(colors.gray("Loading mapping for ") + colors.blue(data.id) + colors.gray("..."));

    // Map only one media. Others likely don't have correct mappings.
    const baseData = await BASE_PROVIDERS.map((provider) => {
        // Use only providers that have the format.
        // Eg. NovelUpdates won't have information on
        // anime.
        if (provider.formats?.includes(data.formats[0])) {
            return provider.getMedia(data.id);
        } else {
            return null;
        }
    }).filter((x) => x !== null)[0];

    // Usually if there is no title, the media doesn't exist.
    if (!baseData || ((!baseData.title.english || baseData.title.english?.length === 0) && (!baseData.title.romaji || baseData.title.romaji?.length === 0) && (!baseData.title.native || baseData.title.native?.length === 0))) {
        console.log(colors.red("Media not found. Skipping..."));

        await emitter.emitAsync(Events.COMPLETED_MAPPING_LOAD, []);
        return [];
    }

    if (baseData.status === MediaStatus.NOT_YET_RELEASED) {
        console.log(colors.red("Media is not yet released. Skipping..."));
        return [];
    }

    // Map the data.
    const result = await map(baseData.type, [baseData.format], baseData);

    // Only return if the ID matches the one we're looking for
    // If it isn't, we don't want to return.
    for (let i = 0; i < result.length; i++) {
        if (String(result[i].id) === String(data.id)) {
            console.log(colors.gray("Found mapping for ") + colors.blue(data.id) + colors.gray(".") + colors.gray(" Saving..."));
            await emitter.emitAsync(Events.COMPLETED_MAPPING_LOAD, [result[i]]);

            return [result[i]] as Anime[] | Manga[];
        }
    }

    await emitter.emitAsync(Events.COMPLETED_MAPPING_LOAD, []);
    return [];
};

// Map and insert a mapping into the database
export const insertMapping = async (data: { id: string; type: Type }, baseData: AnimeInfo | MangaInfo | undefined) => {
    if (!baseData || (baseData as any).isAdult) return [];

    const result = await map(baseData.type, [baseData.format], baseData);

    // Only return if the ID matches the one we're looking for
    // If it isn't, we don't want to return.
    for (let i = 0; i < result.length; i++) {
        if (String(result[i].id) === String(data.id)) {
            console.log(colors.gray("Found mapping for ") + colors.blue(data.id) + colors.gray(".") + colors.gray(" Saving..."));
            await emitter.emitAsync(Events.COMPLETED_MAPPING_LOAD, [result[i]]);
            return [result[i]];
        }
    }

    await emitter.emitAsync(Events.COMPLETED_MAPPING_LOAD, []);
    return [];
};

// Map a media to AniList
export const map = async (type: Type, formats: Format[], baseData: AnimeInfo | MangaInfo | undefined): Promise<Anime[] | Manga[]> => {
    const providers = type === Type.ANIME ? ANIME_PROVIDERS : MANGA_PROVIDERS;
    providers.push(...(META_PROVIDERS as any));

    // Filter out providers that don't contain the format
    const suitableProviders = (providers as any[])
        .filter((provider: any) => {
            if (formats && provider.formats) {
                return formats.some((format) => provider.formats.includes(format));
            }
            return true;
        })
        .reduce((acc: any[], currentProvider: any) => {
            const existingProvider = acc.find((provider: any) => provider.id === currentProvider.id);
            if (!existingProvider) {
                acc.push(currentProvider as any);
            }
            return acc;
        }, []);

    // Handles searching for media on providers
    async function searchMedia(baseData: AnimeInfo | MangaInfo, suitableProviders: any[]) {
        // Define a function to search using a specific title or synonym
        async function searchWith(title: string, provider: any): Promise<Result[]> {
            try {
                let timer: NodeJS.Timeout | null = null;

                const timeoutPromise = new Promise<void>((_, reject) => {
                    timer = setTimeout(() => {
                        console.log(colors.red(`Timeout while fetching from provider ${colors.blue(provider.id)}. Skipping...`));
                        reject(null);
                    }, 15000);
                });

                const results = await Promise.race([provider.search(title, baseData?.format, baseData?.year), timeoutPromise]);

                clearTimeout(timer ? (timer as NodeJS.Timeout) : ({} as NodeJS.Timeout));

                if (!results) {
                    console.log(colors.red(`Error fetching from provider ${colors.blue(provider.id)}. Skipping...`));
                    return [];
                }

                return results;
            } catch (error) {
                console.log(colors.red(`Error fetching from provider ${colors.blue(provider.id)}. Skipping...`));
                return [];
            }
        }

        const promises: Promise<Result[]>[] = suitableProviders.map(async (provider) => {
            // This will account for if a result returns a title that is a synonym.
            // May result in less-accurate mappings, but overall is better since
            // providers like MangaDex tend to have their official title be a synonym.
            const titlesToSearch = [
                baseData?.title[provider.preferredTitle as "english" | "romaji" | "native"],
                baseData?.title.english,
                baseData?.title.romaji,
                baseData?.title.native,
                ...(baseData?.synonyms || []), // Include synonyms
            ].filter((title) => title);

            for (const title of titlesToSearch) {
                if (!title) continue;

                const results = await searchWith(title, provider);
                if (results.length > 0) {
                    console.log(colors.gray(`Found results for ${colors.blue(title)} on ${colors.blue(provider.id)}. Using alternative title...`));
                    return results;
                }
            }

            return [];
        });

        return await Promise.all(promises);
    }

    console.log(colors.gray("Fetching from providers for ") + colors.blue(baseData?.id ?? "") + colors.gray("..."));
    const resultsArray = await searchMedia(baseData!, suitableProviders);
    console.log(colors.gray("Finished fetching from providers for ") + colors.blue(baseData?.id ?? "") + colors.gray("."));

    const mappings: MappedResult[] = [];

    // Loop through each provider and find the best match
    for (let i = 0; i < resultsArray.length; i++) {
        const providerData = resultsArray[i];
        const title: string = (baseData?.title[suitableProviders[i].preferredTitle as "english" | "romaji" | "native"] ?? baseData?.title.english ?? baseData?.title.romaji ?? baseData?.title.native)!;

        const providerTitles = providerData?.map((m: Result) => {
            const titles = [m.title, ...(m.altTitles ?? [])];
            return titles.filter(isString);
        });

        // If there are no results, skip
        if (!providerTitles || providerTitles?.length === 0) {
            console.log(colors.gray("No results found for ") + colors.blue(title) + colors.gray(" on ") + colors.blue(suitableProviders[i].id) + colors.gray("."));
            continue;
        }

        const titles = [baseData?.title.english, baseData?.title.romaji, baseData?.title.native].concat(baseData?.synonyms ?? []).filter(isString);
        const cleanedTitles = titles.map((x) => clean(x?.toLowerCase().trim() ?? ""));

        // Find the best match
        const bestMatchIndex = findBestMatch2DArray(cleanedTitles, providerTitles);

        if (bestMatchIndex.bestMatch.rating < 0.7) {
            //console.log(colors.gray("Unable to match ") + colors.blue(title) + colors.gray(" for ") + colors.blue(suitableProviders[i].id) + colors.gray(".") + colors.gray(" Best match rating: ") + colors.blue(bestMatchIndex.bestMatch.rating + "") + colors.gray(". ID: ") + colors.blue(providerData[bestMatchIndex.bestMatchIndex].id) + colors.gray(". Title: ") + colors.blue(providerData[bestMatchIndex.bestMatchIndex].title) + colors.gray("."));
            continue;
        }

        const best: Result = providerData[bestMatchIndex.bestMatchIndex];

        // Add checks if the format is not the same
        if (best.format != Format.UNKNOWN && baseData?.format && baseData?.format != Format.UNKNOWN && best.format != baseData?.format) continue;
        // Add checks if the year isn't the same. Note that it also checks if the year + 1 or year - 1 is not the same to avoid false positives
        if (best.year != 0 && baseData?.year && baseData?.year != 0 && best.year != baseData?.year && best.year + 1 != baseData?.year && best.year - 1 != baseData?.year) continue;

        const altTitles: string[] = Object.values(baseData?.title ?? {})
            .concat(baseData?.synonyms ?? [])
            .filter(isString);

        const sim = similarity(title, best.title, altTitles);

        // Remove if similarity is too low
        if (sim.value < 0.4) continue;

        if (mappings.filter((m) => m.data.id === best.id).length > 0) continue;

        mappings.push({
            id: baseData?.id ?? "",
            slug: slugify(baseData?.title.english ?? baseData?.title.romaji ?? baseData?.title.native ?? ""),
            data: best,
            similarity: sim.value,
        });
    }

    // Create the media object
    const result = await createMedia(mappings, type);

    console.log(colors.yellow("Finished fetching from providers.") + colors.blue(" - ") + colors.yellow(baseData?.title.english ?? baseData?.title.romaji ?? baseData?.title.native ?? ""));
    return result;
};

/**
 * @description Creates a media object and fetches information from information providers.
 * @param mappings Mapped results from the map() function
 * @param type Type of media
 * @returns Promise<Anime[] | Manga[]>
 */
export async function createMedia(mappings: MappedResult[], type: Type): Promise<Anime[] | Manga[]> {
    const results: any[] = [];

    for (const mapping of mappings) {
        let hasPushed = false;
        const providerType: ProviderType | null = animeProviders[mapping.data.providerId]?.providerType
            ? ProviderType.ANIME
            : mangaProviders[mapping.data.providerId]?.providerType
            ? ProviderType.MANGA
            : metaProviders[mapping.data.providerId]?.providerType
            ? ProviderType.META
            : infoProviders[mapping.data.providerId]?.providerType
            ? ProviderType.INFORMATION
            : null;

        for (const result of results) {
            if (result.id === mapping.id) {
                hasPushed = true;

                const toPush = {
                    id: mapping.data.id,
                    providerId: mapping.data.providerId,
                    providerType,
                    similarity: mapping.similarity,
                };

                result.mappings.push(toPush);
            }
        }

        if (!hasPushed) {
            if (type === Type.ANIME) {
                const anime: Anime = {
                    id: mapping.id,
                    slug: mapping.slug,
                    coverImage: "",
                    bannerImage: "",
                    trailer: "",
                    status: null,
                    type: Type.ANIME,
                    season: Season.UNKNOWN,
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
                            providerType,
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
                    format: Format.UNKNOWN,
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
                };

                results.push(anime);
            } else {
                const manga: Manga = {
                    id: mapping.id,
                    slug: mapping.slug,
                    coverImage: "",
                    bannerImage: "",
                    status: null,
                    type: Type.MANGA,
                    title: {
                        romaji: null,
                        english: null,
                        native: null,
                    },
                    mappings: [
                        {
                            id: mapping.data.id,
                            providerId: mapping.data.providerId,
                            providerType,
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
                    format: Format.UNKNOWN,
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
                };

                results.push(manga);
            }
        }
    }

    for (let i = 0; i < results.length; i++) {
        const media = results[i];

        for (let j = 0; j < INFORMATION_PROVIDERS.length; j++) {
            const provider = INFORMATION_PROVIDERS[j];
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
export function fillMediaInfo<T extends Anime | Manga, U extends AnimeInfo | MangaInfo>(media: T, info: U, provider: InformationProvider<T, U>): T {
    try {
        // Fields that need to be cross loaded. For example, rating which contains Kitsu, AniList, and MAL fields.
        const crossLoadFields: (keyof AnimeInfo | MangaInfo)[] = ["popularity", "rating"];

        // Special fields that are handled differently than others.
        const specialLoadFields: (keyof AnimeInfo | MangaInfo)[] = ["title"];

        for (const ak of Object.keys(info)) {
            if (crossLoadFields.includes(ak as any) || provider.sharedArea.includes(ak as any) || specialLoadFields.includes(ak as any)) continue;

            const v = media[ak as keyof (Anime | Manga)];

            let write = false;
            if ((!v || v === "UNKNOWN") && !!info[ak as keyof (AnimeInfo | MangaInfo)] && info[ak as keyof (AnimeInfo | MangaInfo)] !== "UNKNOWN") {
                write = true;
            } else {
                if (provider.priorityArea.includes(ak as any) && !!info[ak as keyof (AnimeInfo | MangaInfo)]) write = true;
            }

            if (write) {
                // Use type assertion to indicate that ak is of type keyof (Anime | Manga)
                (media[ak as keyof (Anime | Manga)] as any) = info[ak as keyof (AnimeInfo | MangaInfo)] as any;
            }
        }

        for (const special of specialLoadFields) {
            const v = info[special as keyof (AnimeInfo | MangaInfo)];
            if (v) {
                // ak is the english/romaji/native title
                // av is the actual title
                for (const [ak, av] of Object.entries(v)) {
                    if (av && (av as any)?.length) {
                        if (!(media[special as keyof (Anime | Manga)] as any)[ak]) {
                            (media[special as keyof (Anime | Manga)] as any)[ak] = {};

                            Object.assign(media[special as keyof (Anime | Manga)] ?? {}, {
                                [ak]: av,
                            });
                        }
                    }
                }

                /*
                for (const [ak, av] of Object.entries(v)) {
                    if (av && (av as any)?.length) {
                        if (media[special as keyof (Anime | Manga)] !== null) {
                            (media[special as keyof (Anime | Manga)] as any)[ak] = av;
                        }
                    }
                }
                */
            }
        }

        for (const shared of provider.sharedArea) {
            if (!media[shared as keyof (Anime | Manga)]) {
                (media[shared as keyof (Anime | Manga)] as any) = [];
            }

            (media[shared as keyof (Anime | Manga)] as any) = [...new Set((media[shared as keyof (Anime | Manga)] as any).concat(info[shared as keyof (AnimeInfo | MangaInfo)] ?? []))];
        }

        for (const crossLoad of crossLoadFields) {
            if (info[crossLoad as keyof (AnimeInfo | MangaInfo)]) {
                if (media[crossLoad as keyof (Anime | Manga)] === null || media[crossLoad as keyof (Anime | Manga)] === undefined) {
                    (media[crossLoad as keyof (Anime | Manga)] as any) = {};

                    Object.assign(media[crossLoad as keyof (Anime | Manga)] ?? {}, {
                        [provider.id]: info[crossLoad as keyof (AnimeInfo | MangaInfo)],
                    });
                }
                if (media[crossLoad as keyof (Anime | Manga)] !== null && media[crossLoad as keyof (Anime | Manga)] !== undefined) {
                    if (media[crossLoad as keyof (Anime | Manga)]) {
                        (media[crossLoad as keyof (Anime | Manga)] as any)[provider.id] = info[crossLoad as keyof (AnimeInfo | MangaInfo)] as any;
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

export interface MappedResult {
    id: string;
    slug: string;
    data: Result;
    similarity: number;
}
