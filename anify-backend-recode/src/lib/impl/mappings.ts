import colors from "colors";
import { get } from "../../database/impl/get";
import emitter, { Events } from "..";
import { Anime, AnimeInfo, Manga, MangaInfo, Result } from "../../types/types";
import { Format, MediaStatus, ProviderType, Season, Type } from "../../types/enums";
import { ANIME_PROVIDERS, INFORMATION_PROVIDERS, MANGA_PROVIDERS, META_PROVIDERS, animeProviders, baseProviders, infoProviders, mangaProviders, metaProviders } from "../../mappings";
import { clean, slugify } from "../../helper/title";
import { findBestMatch2DArray, similarity } from "../../helper/stringSimilarity";
import { isString } from "../../helper";
import InformationProvider from "../../mappings/impl/information";

export const loadMapping = async (data: { id: string; type: Type }, aniData?: AnimeInfo | MangaInfo | null, retries = 0, media?: Anime | Manga): Promise<Anime[] | Manga[]> => {
    const MIN_MAPPINGS = 3;
    const MAX_RETRIES = 2;

    if (retries > 0) console.log(colors.yellow("Remapping ") + colors.blue(data.id) + colors.yellow(" with retry ") + colors.blue(retries + "") + colors.yellow("..."));

    if (!aniData) {
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
    }

    console.log(colors.gray("Loading mapping for ") + colors.blue(data.id) + colors.gray("..."));

    // Map only one media
    if (!aniData) {
        aniData = await baseProviders.anilist.getMedia(data.id);
    }

    if (!aniData) {
        await emitter.emitAsync(Events.COMPLETED_MAPPING_LOAD, []);
        return [];
    }

    if ((aniData as any).isAdult) {
        console.log(colors.red("Media is adult. Skipping..."));
        return [];
    }
    if (aniData.status === MediaStatus.NOT_YET_RELEASED) {
        console.log(colors.red("Media is not yet released. Skipping..."));
        return [];
    }

    const result = await map((aniData as any)?.type, [aniData?.format!], aniData, media);

    // Only return if the ID matches the one we're looking for
    // If it isn't, we don't want to return.
    for (let i = 0; i < result.length; i++) {
        if (String(result[i].id) === String(data.id)) {
            console.log(colors.gray("Found mapping for ") + colors.blue(data.id) + colors.gray(".") + colors.gray(" Saving..."));
            await emitter.emitAsync(Events.COMPLETED_MAPPING_LOAD, [result[i]]);

            // Only return if anime or manga mappings are greater than MIN_MAPPINGS.
            const mappings = result[i].mappings.filter((item) => item.providerType === ProviderType.ANIME || item.providerType === ProviderType.MANGA);

            if (mappings.length < MIN_MAPPINGS && retries < MAX_RETRIES) return loadMapping(data, aniData, retries + 1, result[i]);

            return [result[i]] as Anime[] | Manga[];
        }
    }

    await emitter.emitAsync(Events.COMPLETED_MAPPING_LOAD, []);
    return [];
};

// Map and insert a mapping into the database
export const insertMapping = async (data: { id: string; type: Type }, aniData: AnimeInfo | MangaInfo | undefined) => {
    if ((aniData as any).isAdult) return [];

    const result = await map((aniData as any)?.type, [aniData?.format!], aniData);

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
export const map = async (type: Type, formats: Format[], aniData: AnimeInfo | MangaInfo | undefined, media?: Anime | Manga): Promise<Anime[] | Manga[]> => {
    const providers = type === Type.ANIME ? ANIME_PROVIDERS : MANGA_PROVIDERS;
    providers.push(...(META_PROVIDERS as any));

    if (media) {
        aniData?.synonyms?.push(...media.synonyms);
        aniData?.synonyms?.push(...(media.title.english ? [media.title.english] : []));
        aniData?.synonyms?.push(...(media.title.native ? [media.title.native] : []));
        aniData?.synonyms?.push(...(media.title.romaji ? [media.title.romaji] : []));

        if (aniData) {
            aniData.title.english = media.title.english;
            aniData.title.native = media.title.native;
            aniData.title.romaji = media.title.romaji;

            aniData.format = media.format;
        }
    }

    // Filter out providers that don't contain the format
    const suitableProviders = providers
        .filter((provider) => {
            if (formats && provider.formats) {
                return formats.some((format) => provider.formats.includes(format));
            }
            return true;
        })
        .reduce((acc: any[], currentProvider) => {
            const existingProvider = acc.find((provider: any) => provider.id === currentProvider.id);
            if (!existingProvider) {
                acc.push(currentProvider);
            }
            return acc;
        }, []);

    // Search for the media on each provider
    const promises = suitableProviders.map((provider: any) => {
        const search = [provider.search(aniData?.title.english ?? aniData?.title.romaji ?? aniData?.title.native, aniData?.format, (aniData as any)?.year)];
        return Promise.all(search)
            .then((results) => {
                return results.find((r) => r?.length !== 0) || [];
            })
            .catch((err) => {
                console.log(colors.red("Error fetching from provider ") + colors.blue(provider.id) + colors.red("."));
                console.error(err);
                return [];
            });
    });

    const resultsArray = await Promise.all(promises);

    const mappings: MappedResult[] = [];

    // Loop through each provider and find the best match
    for (let i = 0; i < resultsArray.length; i++) {
        const providerData = resultsArray[i];
        const title: string = (aniData?.title.english ?? aniData?.title.romaji ?? aniData?.title.native)!;

        const providerTitles = providerData.map((m: Result) => {
            const titles = [m.title, ...(m.altTitles ?? [])];
            return titles;
        });

        // If there are no results, skip
        if (providerTitles.length === 0) {
            console.log(colors.gray("No results found for ") + colors.blue(title) + colors.gray(" on ") + colors.blue(suitableProviders[i].id) + colors.gray("."));
            continue;
        }

        const titles = [aniData?.title.english, aniData?.title.romaji, aniData?.title.native].filter(isString);
        const cleanedTitles = titles.map((x) => clean(x?.toLowerCase().trim() ?? ""));

        const bestMatchIndex = findBestMatch2DArray(cleanedTitles, providerTitles);

        if (bestMatchIndex.bestMatch.rating < 0.5) {
            continue;
        }

        const best: Result = providerData[bestMatchIndex.bestMatchIndex];

        // Add checks
        if (best.format != Format.UNKNOWN && aniData?.format && aniData?.format != Format.UNKNOWN && best.format != aniData?.format) continue;
        if (best.year != 0 && aniData?.year && aniData?.year != 0 && best.year != aniData?.year) continue;

        const altTitles: string[] = Object.values(aniData?.title ?? {})
            .concat(aniData?.synonyms ?? [])
            .filter(isString);

        const sim = similarity(title, best.title, altTitles);

        //if (sim.value < 0.6) continue;
        if (mappings.filter((m) => m.data.id === best.id).length > 0) continue;

        mappings.push({
            id: aniData?.id ?? "",
            slug: slugify(aniData?.title.english ?? aniData?.title.romaji ?? aniData?.title.native ?? ""),
            data: best,
            similarity: sim.value,
        });
    }

    // Create the media object
    const result = await createMedia(mappings, type);

    console.log(colors.yellow("Finished fetching from providers.") + colors.blue(" - ") + colors.yellow(aniData?.title.english ?? aniData?.title.romaji ?? aniData?.title.native!));
    return result;
};

export async function createMedia(mappings: MappedResult[], type: Type): Promise<Anime[] | Manga[]> {
    const results: any[] = [];

    for (const mapping of mappings) {
        let hasPushed = false;
        const providerType: ProviderType | null = animeProviders[mapping.data.providerId]?.providerType ? ProviderType.ANIME : mangaProviders[mapping.data.providerId]?.providerType ? ProviderType.MANGA : metaProviders[mapping.data.providerId]?.providerType ? ProviderType.META : infoProviders[mapping.data.providerId]?.providerType ? ProviderType.INFORMATION : null;

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

function fillMediaInfo<T extends Anime | Manga, U extends AnimeInfo | MangaInfo>(media: T, info: U, provider: InformationProvider<T, U>): T {
    try {
        // Fields that need to be cross loaded. For example, rating which contains Kitsu, AniList, and MAL fields.
        const crossLoadFields: (keyof AnimeInfo | MangaInfo)[] = ["popularity", "rating"];

        // TODO: Comment needs to be written here
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
                for (const [ak, av] of Object.entries(v)) {
                    if (av && (av as any)?.length) {
                        if (media[special as keyof (Anime | Manga)] !== null) {
                            (media[special as keyof (Anime | Manga)] as any)[ak] = av;
                        }
                    }
                }
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
