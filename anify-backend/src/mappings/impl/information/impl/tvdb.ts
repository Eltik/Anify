import InformationProvider from "..";
import { type IChapter, type IEpisode, MediaFormat, MediaSeason, MediaType, ProviderType } from "../../../../types";
import type { ICharacter } from "../../../../types/impl/database/impl/mappings";
import type { IAnime } from "../../../../types/impl/database/impl/schema/anime";
import type { IManga } from "../../../../types/impl/database/impl/schema/manga";
import type { AnimeInfo, MangaInfo, MediaInfoKeys } from "../../../../types/impl/mappings/impl/mediaInfo";

export default class TVDBInfo extends InformationProvider<IAnime | IManga, AnimeInfo | MangaInfo> {
    override id = "tvdb";
    override url = "https://thetvdb.com";

    private api = "https://api4.thetvdb.com/v4";
    private apiKeys = ["f5744a13-9203-4d02-b951-fbd7352c1657", "8f406bec-6ddb-45e7-8f4b-e1861e10f1bb", "5476e702-85aa-45fd-a8da-e74df3840baf", "51020266-18f7-4382-81fc-75a4014fa59f"];

    public needsProxy = true;
    public useGoogleTranslate = false;

    override rateLimit = 0;
    override maxConcurrentRequests = -1;

    override formats: MediaFormat[] = [MediaFormat.TV, MediaFormat.MOVIE, MediaFormat.ONA, MediaFormat.SPECIAL, MediaFormat.TV_SHORT, MediaFormat.OVA];

    override get priorityArea(): MediaInfoKeys[] {
        return ["bannerImage", "coverImage"];
    }

    override get sharedArea(): MediaInfoKeys[] {
        return ["synonyms", "genres", "tags", "artwork", "characters"];
    }

    override async info(media: IAnime | IManga): Promise<AnimeInfo | MangaInfo | undefined> {
        const tvdbId = media.mappings.find((data) => {
            return data.providerId === "tvdb";
        })?.id;

        if (!tvdbId) return undefined;

        const token = await this.getToken(this.apiKeys[Math.floor(Math.random() * this.apiKeys.length)]);

        const data: Response | undefined = await this.request(`${this.api}${tvdbId}/extended`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
            validateResponse: async (response) => {
                if (!response.ok) return false;
                try {
                    const data = (await response.json()) as { data: ITVDBResponse };
                    return data.data !== undefined;
                } catch {
                    return false;
                }
            },
        }).catch(() => {
            return undefined;
        });

        if (!data) return undefined;

        if (data.ok) {
            const info = ((await data.json()) as { data: ITVDBResponse }).data;

            //const img = info.image;
            const aliases = info.aliases;
            const firstAired = new Date(info.firstAired);

            const averageRunTime = info.averageRuntime;

            const characters: ICharacter[] = (info.characters ?? [])
                .map((character) => {
                    // Check if the character already exists in the media
                    const existingCharacter = media.characters.find((char) => char.name === character.name);
                    if (!existingCharacter) {
                        return {
                            name: character.name,
                            image: character.image,
                            voiceActor: {
                                name: character.peopleName ?? character.personName,
                                image: character.peopleImageURL ?? character.personImgURL,
                            },
                        };
                    }
                })
                .filter(Boolean) as ICharacter[];

            const artwork: IArtwork[] = info.artworks;

            const artworkIds = {
                banner: [1, 16, 6],
                poster: [2, 7, 14, 27],
                backgrounds: [3, 8, 15],
                icon: [5, 10, 18, 19, 26],
                clearArt: [22, 24],
                clearLogo: [23, 25],
                fanart: [11, 12],
                actorPhoto: [13],
                cinemagraphs: [20, 21],
            };

            const coverImages = artwork.filter((art) => artworkIds.poster.includes(Number(art.type)));
            coverImages.sort((a, b) => b.score - a.score);

            const banners = artwork.filter((art) => artworkIds.backgrounds.includes(Number(art.type)));
            banners.sort((a, b) => b.score - a.score);

            const genres = info.genres;

            const trailers = info.trailers;

            //const airsDays = info.airsDays; // Helpful

            const artworkData = artwork
                .map((art) => {
                    const type = artworkIds.backgrounds.includes(art.type)
                        ? "banner"
                        : artworkIds.banner.includes(art.type)
                          ? "top_banner"
                          : artworkIds.clearLogo.includes(art.type)
                            ? "clear_logo"
                            : artworkIds.poster.includes(art.type)
                              ? "poster"
                              : artworkIds.icon.includes(art.type)
                                ? "icon"
                                : artworkIds.clearArt.includes(art.type)
                                  ? "clear_art"
                                  : null;
                    if (!type) return;
                    return {
                        type: type,
                        img: art.image,
                        providerId: this.id,
                    };
                })
                .filter(Boolean);

            const hasPrequelRelation = media.relations.some((relation) => relation.relationType === "PREQUEL");

            const coverImage = !hasPrequelRelation ? (coverImages[0]?.image ?? media.coverImage ?? null) : (media.coverImage ?? null);

            return {
                id: tvdbId,
                title: {
                    english: null,
                    romaji: null,
                    native: null,
                },
                currentEpisode: null,
                trailer: trailers[0]?.url ?? null,
                duration: averageRunTime ?? null,
                color: null,
                bannerImage: banners[0]?.image ?? null,
                coverImage,
                status: null,
                format: MediaFormat.UNKNOWN,
                season: MediaSeason.UNKNOWN,
                synonyms: aliases?.map((alias: { name: string }) => alias.name) ?? [],
                description: null,
                year: Number(info.year ?? firstAired.getFullYear()) ?? null,
                totalEpisodes: 0,
                genres: genres ? genres.map((genre: { name: string }) => genre.name) : [],
                rating: null,
                popularity: null,
                countryOfOrigin: null,
                tags: info.tags?.map((tag: { name: string }) => tag.name) ?? [],
                relations: [],
                artwork: artworkData,
                characters: characters.slice(0, 10),
                totalChapters: null,
                totalVolumes: null,
                type: media.type,
            } as AnimeInfo;
        }

        return undefined;
    }

    override async fetchContentData(media: IAnime | IManga): Promise<IEpisode[] | IChapter[] | undefined> {
        const tvdbId = media.mappings.find((data) => data.providerId === "tvdb")?.id;
        if (!tvdbId) return undefined;

        const token = await this.getToken(this.apiKeys[Math.floor(Math.random() * this.apiKeys.length)]);
        if (!token) return undefined;

        // Get initial info with seasons
        const infoRequest = await this.request(`${this.api}${tvdbId}/extended`, {
            headers: { Authorization: `Bearer ${token}` },
            validateResponse: async (response) => {
                if (!response.ok) return false;
                try {
                    const data = (await response.json()) as { data: ITVDBResponse };
                    return data.data !== undefined;
                } catch {
                    return false;
                }
            },
        }).catch(() => undefined);
        if (!infoRequest?.ok) return undefined;

        const { seasons } = ((await infoRequest.json()) as { data: { seasons: ITVDBSeason[] } }).data;
        if (!seasons?.length) return undefined;

        // Create a Map to track unique episodes by number
        const uniqueEpisodes = new Map<number, IEpisode>();

        // Process seasons in parallel but only for matching year
        await Promise.all(
            seasons.map(async (season) => {
                const seasonResponse = await this.request(`${this.api}/seasons/${season.id}/extended`, {
                    headers: { Authorization: `Bearer ${token}` },
                    validateResponse: async (response) => {
                        if (!response.ok) return false;
                        try {
                            const data = (await response.json()) as { data: ISeasonInfo };
                            return data.data !== undefined;
                        } catch {
                            return false;
                        }
                    },
                }).catch(() => undefined);
                if (!seasonResponse?.ok) return;

                const seasonInfo = ((await seasonResponse.json()) as { data: ISeasonInfo }).data;
                if (!seasonInfo?.episodes?.length || Number(seasonInfo.year) !== media.year) return;

                // Process episodes in parallel for each season
                await Promise.all(
                    seasonInfo.episodes.map(async (episode) => {
                        if (!uniqueEpisodes.has(episode.number)) {
                            // Always fetch English translations
                            const translationResponse = await this.request(`${this.api}/episodes/${episode.id}/translations/eng`, {
                                headers: { Authorization: `Bearer ${token}` },
                                validateResponse: async (response) => {
                                    if (!response.ok) return false;
                                    try {
                                        const data = (await response.json()) as {
                                            data: {
                                                name: string;
                                                overview: string;
                                                language: string;
                                            };
                                        };
                                        return data.data !== undefined;
                                    } catch {
                                        return false;
                                    }
                                },
                            }).catch(() => undefined);

                            let title = episode.name;
                            let description = episode.overview;

                            if (translationResponse?.ok) {
                                const translation = (
                                    (await translationResponse.json()) as {
                                        data: {
                                            name: string;
                                            overview: string;
                                            language: string;
                                        };
                                    }
                                ).data;
                                // Prefer English translations, fallback to original
                                title = translation.name ?? episode.name;
                                description = translation.overview ?? episode.overview;
                            }

                            uniqueEpisodes.set(episode.number, {
                                id: String(episode.id),
                                description: description ?? "TBD",
                                hasDub: false,
                                img: episode.image ?? null,
                                isFiller: false,
                                number: episode.number,
                                title: title ?? "TBD",
                                rating: null,
                                updatedAt: new Date(episode.aired).getTime(),
                            });
                        }
                    }),
                );
            }),
        );

        // Convert map to array and sort by episode number
        return Array.from(uniqueEpisodes.values()).sort((a, b) => a.number - b.number);
    }

    private async getToken(key: string, proxyURL?: string): Promise<string | undefined> {
        const data: Response | undefined = await this.request(`${this.api}/login`, {
            proxy: proxyURL,
            body: JSON.stringify({
                apikey: `${key}`,
            }),
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        }).catch(() => {
            return undefined;
        });
        if (!data) return undefined;

        if (data.ok) {
            return ((await data.json()) as { data: { token: string } }).data.token as string;
        }

        return undefined;
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
                        id: "/series/371310",
                        providerId: "tvdb",
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

            const tvdbId = media.mappings.find((data) => {
                return data.providerId === "tvdb";
            })?.id;

            if (!tvdbId) return undefined;

            const token = await this.getToken(this.apiKeys[Math.floor(Math.random() * this.apiKeys.length)], proxyURL);

            const data: Response | undefined = await this.request(`${this.api}${tvdbId}/extended`, {
                proxy: proxyURL,
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }).catch(() => {
                return undefined;
            });

            if (!data) return false;

            if (data.ok) {
                await data.json();
                return true;
            }

            return false;
        } catch {
            return false;
        }
    }
}

interface ITVDBResponse {
    id: number;
    name: string;
    slug: string;
    image: string;
    nameTranslations: string[];
    overviewTranslations: string[];
    aliases: {
        language: string;
        name: string;
    }[];
    firstAired: string;
    lastAired: string;
    nextAired: string;
    score: number;
    status: {
        id: number;
        name: string;
        recordType: string;
        keepUpdated: boolean;
    };
    originalCountry: string;
    originalLanguage: string;
    defaultSeasonType: number;
    isOrderRandomized: boolean;
    lastUpdated: string;
    averageRuntime: number;
    episodes: number | null;
    overview: string;
    year: number;
    artworks: IArtwork[];
    companies: INetwork[];
    originalNetwork: INetwork;
    latestNetwork: INetwork;
    genres: {
        id: number;
        name: string;
        slug: string;
    }[];
    trailers: {
        id: number;
        name: string;
        url: string;
        language: string;
        runtime: number;
    }[];
    lists: IList[];
    remoteIds: {
        id: string;
        type: number;
        sourceName: string;
    }[];
    characters: ITVDBCharacter[];
    airsDays: {
        sunday: boolean;
        monday: boolean;
        tuesday: boolean;
        wednesday: boolean;
        thursday: boolean;
        friday: boolean;
        saturday: boolean;
    };
    airsTime: string;
    seasons: ITVDBSeason[];
    tags: {
        id: number;
        tag: number;
        tagName: string;
        name: string;
        helpText: null;
    }[];
    contentRatings: {
        id: number;
        name: string;
        country: string;
        description: string;
        contentType: string;
        order: number;
        fullname: string | null;
    }[];
    seasonTypes: {
        id: number;
        name: string;
        type: string;
        alternateName: string | null;
    }[];
}

interface IArtwork {
    id: number;
    image: string;
    thumbnail: string;
    language: null | string;
    type: number;
    score: number;
    width: number;
    height: number;
    includesText: boolean;
    thumbnailWidth: number;
    thumbnailHeight: number;
    updatedAt: number;
    status: {
        id: number;
        name: null | string;
    };
    tagOptions: null;
}

interface INetwork {
    id: number;
    name: string;
    slug: string;
    nameTranslations: string[];
    overviewTranslations: string[];
    aliases: string[];
    country: string;
    primaryCompanyType: number;
    activeDate: null;
    inactiveDate: null;
    companyType: {
        companyTypeId: number;
        companyTypeName: string;
    };
    parentCompany: {
        id: null;
        name: null;
        relation: {
            id: null;
            typeName: null;
        };
    };
}

interface IList {
    id: number;
    name: string;
    overview: string;
    url: string;
    isOfficial: boolean;
    nameTranslations: string[];
    overviewTranslations: string[];
    aliases: string[];
    score: number;
    image: string;
    imageIsFallback: boolean;
    remoteIds: null;
    tags: null;
}

interface ITVDBCharacter {
    id: number;
    name: string;
    peopleId: number;
    seriesId: number;
    series: null;
    movie: null;
    movieId: null;
    episodeId: null;
    type: number;
    image: string;
    sort: number;
    isFeatured: boolean;
    url: string;
    nameTranslations: null;
    overviewTranslations: null;
    aliases: null;
    peopleType: string;
    peopleName: string;
    peopleImageURL: string;
    personName: string;
    tagOptions: null;
    personImgURL: string;
}

interface ITVDBSeason {
    id: number;
    seriesId: number;
    type: {
        id: number;
        name: string;
        type: string;
        alternateName: null;
    };
    number: number;
    nameTranslations: string[];
    overviewTranslations: string[];
    image: string;
    imageType: number;
    companies: {
        studio: null;
        network: null;
        production: null;
        distributor: null;
        specialEffects: null;
    };
    lastUpdated: string;
}

interface ISeasonInfo {
    id: number;
    seriesId: number;
    type: {
        id: number;
        name: string;
        type: string;
        alternateName: string | null;
    };
    number: number;
    nameTranslations: string[];
    overviewTranslations: string[];
    companies: {
        studio: null;
        network: null;
        production: null;
        distributor: null;
        specialEffects: null;
    };
    lastUpdated: string;
    year: number;
    episodes: ITVDBEpisode[];
    trailers: {
        id: number;
        name: string;
        url: string;
        language: string;
        runtime: number;
    }[];
    artwork: IArtwork[];
    tagOptions: null;
}

interface ITVDBEpisode {
    id: number;
    seriesId: number;
    seasonId: number;
    name: string;
    aired: string;
    runtime: number;
    nameTranslations: string[];
    overview: string;
    overviewTranslations: string[];
    image: string;
    imageType: number;
    isMovie: boolean;
    seasons: null;
    number: number;
    absoluteNumber: number;
    seasonNumber: number;
    lastUpdated: string;
    finaleType: null;
}
