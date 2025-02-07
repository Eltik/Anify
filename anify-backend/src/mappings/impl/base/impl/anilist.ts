import BaseProvider from "..";
import { MediaFormat, MediaSeason, MediaStatus, MediaType } from "../../../../types";
import type { IArtwork, ICharacter, IRelations } from "../../../../types/impl/database/impl/mappings";
import { ISeasonal } from "../../../../types/impl/mappings";
import type { AnimeInfo, MangaInfo } from "../../../../types/impl/mappings/impl/mediaInfo";

export default class AniListBase extends BaseProvider {
    override rateLimit: number = 0;
    override maxConcurrentRequests: number = -1;
    override id = "anilist";
    override url = "https://anilist.co";

    override formats: MediaFormat[] = [MediaFormat.MOVIE, MediaFormat.ONA, MediaFormat.OVA, MediaFormat.SPECIAL, MediaFormat.TV, MediaFormat.TV_SHORT];

    public needsProxy: boolean = true;
    public useGoogleTranslate: boolean = false;

    private api = "https://graphql.anilist.co";

    override async search(query: string, type: MediaType, formats: MediaFormat[], page: number, perPage: number): Promise<AnimeInfo[] | MangaInfo[] | undefined> {
        const aniListArgs: { query: string; variables: { [key: string]: string | number | MediaFormat[] } } = {
            query: `
            query ($page: Int, $perPage: Int, $search: String, $type: MediaType, $format: [MediaFormat]) {
                Page(page: $page, perPage: $perPage) {
                    pageInfo {
                        total
                        currentPage
                        lastPage
                        hasNextPage
                        perPage
                    }
                    media(type: $type, format_in: $format, search: $search) {
                        ${this.query}
                    }
                }
            }
            `,
            variables: {
                search: query,
                type: type,
                format: formats,
                page: page,
                perPage: perPage,
            },
        };

        const req = await this.request(this.api, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                origin: "graphql.anilist.co",
            },
            body: JSON.stringify(aniListArgs),
            validateResponse: async (response) => {
                if (!response.ok) return false;
                try {
                    const json = (await response.json()) as { data: { Page: { media: IMedia[] } } };
                    return json.data?.Page.media !== undefined;
                } catch {
                    return false;
                }
            },
        });
        const json = (await req?.json()) as { data: { Page: { media: IMedia[] } } };
        const media = json?.data?.Page.media;

        if (!media) return undefined;

        if (type === MediaType.ANIME) {
            return media
                .map((data: IMedia) => {
                    if (data.isAdult) return undefined;

                    const artwork: IArtwork[] = [];

                    if (data.coverImage.large)
                        artwork.push({
                            type: "poster",
                            img: data.coverImage.large,
                            providerId: this.id,
                        });
                    if (data.coverImage.extraLarge)
                        artwork.push({
                            type: "poster",
                            img: data.coverImage.extraLarge,
                            providerId: this.id,
                        });
                    if (data.bannerImage)
                        artwork.push({
                            type: "banner",
                            img: data.bannerImage,
                            providerId: this.id,
                        });

                    const characters: ICharacter[] = [];
                    const relations: IRelations[] = [];

                    for (const character of data.characters.edges) {
                        if (characters.length > 10) break;
                        const aliases: string[] = [];

                        for (const alias of character.node.name.alternative) {
                            aliases.push(alias);
                        }
                        aliases.push(character.node.name.full);

                        characters.push({
                            voiceActor: {
                                name: character.voiceActors[0]?.name?.full ?? null,
                                image: character.voiceActors[0]?.image?.large ?? null,
                            },
                            image: character.node.image.large,
                            name: character.node.name.full,
                        });
                    }

                    for (const relation of data.relations.edges) {
                        relations.push({
                            id: String(relation.node.id),
                            format: relation.node.format,
                            relationType: relation.relationType,
                            title: relation.node.title,
                            type: relation.node.type,
                        });
                    }

                    return {
                        id: String(data.id),
                        title: {
                            english: data.title.english ?? null,
                            romaji: data.title.romaji ?? null,
                            native: data.title.native ?? null,
                        },
                        trailer: null,
                        currentEpisode: data.status === MediaStatus.FINISHED || data.status === MediaStatus.CANCELLED ? (data.episodes ?? 0) : 0,
                        duration: data.duration ?? null,
                        coverImage: data.coverImage.extraLarge ?? null,
                        bannerImage: data.bannerImage ?? null,
                        popularity: Number(data.popularity),
                        synonyms: data.synonyms ?? [],
                        totalEpisodes: data.episodes ?? 0,
                        color: null,
                        status: data.status,
                        season: data.season as MediaSeason,
                        genres: data.genres ?? [],
                        rating: data.meanScore ? data.meanScore / 10 : null,
                        description: data.description ?? null,
                        format: data.format,
                        year: data.seasonYear ?? data.startDate?.year ?? null,
                        type: data.type,
                        countryOfOrigin: data.countryOfOrigin ?? null,
                        tags: data.tags.map((tag) => {
                            return tag.name;
                        }),
                        artwork: artwork,
                        relations: relations,
                        characters: characters,
                    } as AnimeInfo;
                })
                .filter(Boolean) as AnimeInfo[];
        } else {
            return media
                .map((data: IMedia) => {
                    if (data.isAdult) return undefined;

                    const artwork: IArtwork[] = [];

                    if (data.coverImage.large)
                        artwork.push({
                            type: "poster",
                            img: data.coverImage.large,
                            providerId: this.id,
                        });
                    if (data.coverImage.extraLarge)
                        artwork.push({
                            type: "poster",
                            img: data.coverImage.extraLarge,
                            providerId: this.id,
                        });
                    if (data.bannerImage)
                        artwork.push({
                            type: "banner",
                            img: data.bannerImage,
                            providerId: this.id,
                        });

                    const characters: ICharacter[] = [];
                    const relations: IRelations[] = [];

                    for (const character of data.characters.edges) {
                        if (characters.length > 10) break;
                        const aliases: string[] = [];

                        for (const alias of character.node.name.alternative) {
                            aliases.push(alias);
                        }
                        aliases.push(character.node.name.full);

                        characters.push({
                            voiceActor: {
                                name: character.voiceActors[0]?.name?.full ?? null,
                                image: character.voiceActors[0]?.image?.large ?? null,
                            },
                            image: character.node.image.large,
                            name: character.node.name.full,
                        });
                    }

                    for (const relation of data.relations.edges) {
                        relations.push({
                            id: String(relation.node.id),
                            format: relation.node.format,
                            relationType: relation.relationType,
                            title: relation.node.title,
                            type: relation.node.type,
                        });
                    }

                    return {
                        id: String(data.id),
                        title: {
                            english: data.title.english ?? null,
                            romaji: data.title.romaji ?? null,
                            native: data.title.native ?? null,
                        },
                        coverImage: data.coverImage.extraLarge ?? null,
                        bannerImage: data.bannerImage ?? null,
                        popularity: Number(data.popularity),
                        synonyms: data.synonyms ?? [],
                        totalChapters: data.chapters ?? 0,
                        totalVolumes: data.volumes ?? 0,
                        color: null,
                        status: data.status,
                        genres: data.genres ?? [],
                        rating: data.meanScore ? data.meanScore / 10 : null,
                        description: data.description ?? null,
                        format: data.format,
                        year: data.seasonYear ?? data.startDate?.year ?? null,
                        type: data.type,
                        countryOfOrigin: data.countryOfOrigin ?? null,
                        tags: data.tags.map((tag) => tag.name),
                        artwork: artwork,
                        characters: characters,
                        relations: relations,
                    } as MangaInfo;
                })
                .filter(Boolean) as MangaInfo[];
        }
    }

    override async searchAdvanced(
        query: string,
        type: MediaType,
        formats: MediaFormat[],
        page: number,
        perPage: number,
        genres: string[] = [],
        genresExcluded: string[] = [],
        season: MediaSeason = MediaSeason.UNKNOWN,
        year = 0,
        tags: string[] = [],
        tagsExcluded: string[] = [],
    ): Promise<AnimeInfo[] | MangaInfo[] | undefined> {
        const aniListArgs: { query: string; variables: { [key: string]: string | number | string[] | number[] | undefined } } = {
            query: `
            query ($page: Int, $perPage: Int, $search: String, $type: MediaType, $format: [MediaFormat], $genres: [String], $genresExcluded: [String], $season: MediaSeason, $year: Int, $tags: [String], $tagsExcluded: [String]) {
                Page(page: $page, perPage: $perPage) {
                    pageInfo {
                        total
                        currentPage
                        lastPage
                        hasNextPage
                        perPage
                    }
                    media(type: $type, format_in: $format, search: $search, genre_in: $genres, genre_not_in: $genresExcluded, season: $season, seasonYear: $year, tag_in: $tags, tag_not_in: $tagsExcluded) {
                        ${this.query}
                    }
                }
            }              
            `,
            variables: {
                search: query,
                type: type,
                format: formats,
                page: page,
                perPage: perPage,
                genres: genres,
                genresExclude: genresExcluded,
                season: season,
                year: year,
                tags: tags.length > 0 ? tags : undefined,
                tagsExclude: tagsExcluded,
            },
        };

        if (tags.length === 0) delete aniListArgs.variables.tags;

        const req = await this.request(this.api, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                origin: "graphql.anilist.co",
            },
            body: JSON.stringify(aniListArgs),
            validateResponse: async (response) => {
                if (!response.ok) return false;
                try {
                    const json = (await response.json()) as { data: { Page: { media: IMedia[] } } };
                    return json.data?.Page.media !== undefined;
                } catch {
                    return false;
                }
            },
        });
        const json = (await req?.json()) as { data: { Page: { media: IMedia[] } } };
        const media = json?.data.Page.media;

        if (type === MediaType.ANIME) {
            return media
                .map((data: IMedia) => {
                    if (data.isAdult) return undefined;

                    const artwork: IArtwork[] = [];

                    if (data.coverImage.large)
                        artwork.push({
                            type: "poster",
                            img: data.coverImage.large,
                            providerId: this.id,
                        });
                    if (data.coverImage.extraLarge)
                        artwork.push({
                            type: "poster",
                            img: data.coverImage.extraLarge,
                            providerId: this.id,
                        });
                    if (data.bannerImage)
                        artwork.push({
                            type: "banner",
                            img: data.bannerImage,
                            providerId: this.id,
                        });

                    const characters: ICharacter[] = [];
                    const relations: IRelations[] = [];

                    for (const character of data.characters.edges) {
                        if (characters.length > 10) break;
                        const aliases: string[] = [];

                        for (const alias of character.node.name.alternative) {
                            aliases.push(alias);
                        }
                        aliases.push(character.node.name.full);

                        characters.push({
                            voiceActor: {
                                name: character.voiceActors[0]?.name?.full ?? null,
                                image: character.voiceActors[0]?.image?.large ?? null,
                            },
                            image: character.node.image.large,
                            name: character.node.name.full,
                        });
                    }

                    for (const relation of data.relations.edges) {
                        relations.push({
                            id: String(relation.node.id),
                            format: relation.node.format,
                            relationType: relation.relationType,
                            title: relation.node.title,
                            type: relation.node.type,
                        });
                    }

                    return {
                        id: String(data.id),
                        title: {
                            english: data.title.english ?? null,
                            romaji: data.title.romaji ?? null,
                            native: data.title.native ?? null,
                        },
                        trailer: null,
                        currentEpisode: data.status === MediaStatus.FINISHED || data.status === MediaStatus.CANCELLED ? (data.episodes ?? 0) : 0,
                        duration: data.duration ?? null,
                        coverImage: data.coverImage.extraLarge ?? null,
                        bannerImage: data.bannerImage ?? null,
                        popularity: Number(data.popularity),
                        synonyms: data.synonyms ?? [],
                        totalEpisodes: data.episodes ?? 0,
                        color: null,
                        status: data.status,
                        season: data.season as MediaSeason,
                        genres: data.genres ?? [],
                        rating: data.meanScore ? data.meanScore / 10 : null,
                        description: data.description ?? null,
                        format: data.format,
                        year: data.seasonYear ?? data.startDate?.year ?? null,
                        type: data.type,
                        countryOfOrigin: data.countryOfOrigin ?? null,
                        tags: data.tags.map((tag) => {
                            return tag.name;
                        }),
                        artwork: artwork,
                        relations: relations,
                        characters: characters,
                    } as AnimeInfo;
                })
                .filter(Boolean) as AnimeInfo[];
        } else {
            return media
                .map((data: IMedia) => {
                    if (data.isAdult) return undefined;

                    const artwork: IArtwork[] = [];

                    if (data.coverImage.large)
                        artwork.push({
                            type: "poster",
                            img: data.coverImage.large,
                            providerId: this.id,
                        });
                    if (data.coverImage.extraLarge)
                        artwork.push({
                            type: "poster",
                            img: data.coverImage.extraLarge,
                            providerId: this.id,
                        });
                    if (data.bannerImage)
                        artwork.push({
                            type: "banner",
                            img: data.bannerImage,
                            providerId: this.id,
                        });

                    const characters: ICharacter[] = [];
                    const relations: IRelations[] = [];

                    for (const character of data.characters.edges) {
                        if (characters.length > 10) break;
                        const aliases: string[] = [];

                        for (const alias of character.node.name.alternative) {
                            aliases.push(alias);
                        }
                        aliases.push(character.node.name.full);

                        characters.push({
                            voiceActor: {
                                name: character.voiceActors[0]?.name?.full ?? null,
                                image: character.voiceActors[0]?.image?.large ?? null,
                            },
                            image: character.node.image.large,
                            name: character.node.name.full,
                        });
                    }

                    for (const relation of data.relations.edges) {
                        relations.push({
                            id: String(relation.node.id),
                            format: relation.node.format,
                            relationType: relation.relationType,
                            title: relation.node.title,
                            type: relation.node.type,
                        });
                    }

                    return {
                        id: String(data.id),
                        title: {
                            english: data.title.english ?? null,
                            romaji: data.title.romaji ?? null,
                            native: data.title.native ?? null,
                        },
                        coverImage: data.coverImage.extraLarge ?? null,
                        bannerImage: data.bannerImage ?? null,
                        popularity: Number(data.popularity),
                        synonyms: data.synonyms ?? [],
                        totalChapters: data.chapters ?? 0,
                        totalVolumes: data.volumes ?? 0,
                        color: null,
                        status: data.status,
                        genres: data.genres ?? [],
                        rating: data.meanScore ? data.meanScore / 10 : null,
                        description: data.description ?? null,
                        format: data.format,
                        year: data.seasonYear ?? data.startDate?.year ?? null,
                        type: data.type,
                        countryOfOrigin: data.countryOfOrigin ?? null,
                        tags: data.tags.map((tag) => tag.name),
                        artwork: artwork,
                        characters: characters,
                        relations: relations,
                    } as MangaInfo;
                })
                .filter(Boolean) as MangaInfo[];
        }
    }

    override getCurrentSeason(): MediaSeason {
        const month = new Date().getMonth();

        if ((month >= 0 && month <= 1) || month === 11) {
            return MediaSeason.WINTER;
        } else if (month >= 2 && month <= 4) {
            return MediaSeason.SPRING;
        } else if (month >= 5 && month <= 7) {
            return MediaSeason.SUMMER;
        } else {
            return MediaSeason.FALL;
        }
    }

    override async getMedia(id: string): Promise<AnimeInfo | MangaInfo | undefined> {
        const query = `query ($id: Int) {
            Media (id: $id) {
                ${this.query}
            }
        }`;
        const variables = {
            id: id,
        };

        const req = await this.request(this.api, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                origin: "graphql.anilist.co",
            },
            body: JSON.stringify({
                query,
                variables,
            }),
            validateResponse: async (response) => {
                if (!response.ok) return false;
                try {
                    const json = (await response.json()) as { data: { Media: IMedia } };
                    return json.data?.Media !== undefined;
                } catch {
                    return false;
                }
            },
        });

        const data: IMedia = ((await req.json()) as { data: { Media: IMedia } }).data?.Media;

        if (data.isAdult) return undefined;

        const characters: ICharacter[] = [];
        const relations: IRelations[] = [];

        for (const character of data.characters.edges) {
            if (characters.length > 10) break;
            const aliases: string[] = [];

            for (const alias of character.node.name.alternative) {
                aliases.push(alias);
            }
            aliases.push(character.node.name.full);

            characters.push({
                voiceActor: {
                    name: character.voiceActors[0]?.name?.full ?? null,
                    image: character.voiceActors[0]?.image?.large ?? null,
                },
                image: character.node.image.large,
                name: character.node.name.full,
            });
        }

        for (const relation of data.relations.edges) {
            relations.push({
                id: String(relation.node.id),
                format: relation.node.format,
                relationType: relation.relationType,
                title: relation.node.title,
                type: relation.node.type,
            });
        }

        if (data.type === MediaType.ANIME)
            return {
                id: String(data.id),
                title: {
                    english: data.title.english ?? null,
                    romaji: data.title.romaji ?? null,
                    native: data.title.native ?? null,
                },
                trailer: null,
                currentEpisode: data.status === MediaStatus.FINISHED || data.status === MediaStatus.CANCELLED ? (data.episodes ?? 0) : 0,
                duration: data.duration ?? null,
                coverImage: data.coverImage.extraLarge ?? null,
                bannerImage: data.bannerImage ?? null,
                popularity: Number(data.popularity),
                synonyms: data.synonyms ?? [],
                totalEpisodes: data.episodes ?? 0,
                color: null,
                status: data.status as MediaStatus,
                season: data.season as MediaSeason,
                genres: data.genres ?? [],
                rating: data.meanScore ? data.meanScore / 10 : null,
                description: data.description ?? null,
                type: data.type,
                format: data.format,
                year: data.seasonYear ?? data.startDate?.year ?? null,
                countryOfOrigin: data.countryOfOrigin ?? null,
                tags: data.tags.map((tag) => tag.name),
                relations,
                characters,
                artwork: [
                    {
                        type: "poster",
                        img: data.coverImage.extraLarge,
                        providerId: this.id,
                    },
                    {
                        type: "banner",
                        img: data.bannerImage,
                        providerId: this.id,
                    },
                ],
            };
        else {
            return {
                id: String(data.id),
                title: {
                    english: data.title.english ?? null,
                    romaji: data.title.romaji ?? null,
                    native: data.title.native ?? null,
                },
                coverImage: data.coverImage.extraLarge ?? null,
                bannerImage: data.bannerImage ?? null,
                popularity: Number(data.popularity),
                synonyms: data.synonyms ?? [],
                totalChapters: data.chapters ?? 0,
                totalVolumes: data.volumes ?? 0,
                color: null,
                status: data.status as MediaStatus,
                genres: data.genres ?? [],
                rating: data.meanScore ? data.meanScore / 10 : null,
                description: data.description ?? null,
                type: data.type,
                format: data.format,
                year: data.seasonYear ?? data.startDate?.year ?? null,
                countryOfOrigin: data.countryOfOrigin ?? null,
                tags: data.tags.map((tag) => tag.name),
                relations,
                characters,
                artwork: [
                    {
                        type: "poster",
                        img: data.coverImage.extraLarge,
                        providerId: this.id,
                    },
                    {
                        type: "banner",
                        img: data.bannerImage,
                        providerId: this.id,
                    },
                ],
                author: null,
                publisher: null,
            };
        }
    }

    override async fetchSeasonal(
        type: MediaType,
        formats: MediaFormat[],
    ): Promise<
        | {
              trending: ISeasonal[];
              seasonal: ISeasonal[];
              popular: ISeasonal[];
              top: ISeasonal[];
          }
        | undefined
    > {
        const PAGE = 0;
        const PER_PAGE = 20;

        const aniListArgs = {
            query: `
            query($season: MediaSeason, $seasonYear: Int, $format: [MediaFormat], $page: Int, $perPage: Int, $type: MediaType) {
                trending: Page(page: $page, perPage: $perPage) {
                    media(sort: TRENDING_DESC, type: $type, isAdult: false, format_in: $format) {
                        ...media
                    }
                }
                season: Page(page: $page, perPage: $perPage) {
                    media(season: $season, seasonYear: $seasonYear, sort: POPULARITY_DESC, type: $type, isAdult: false, format_in: $format) {
                        ...media
                    }
                }
                popular: Page(page: $page, perPage: $perPage) {
                    media(sort: POPULARITY_DESC, type: $type, isAdult: false, format_in: $format) {
                        ...media
                    }
                }
                top: Page(page: $page, perPage: $perPage) {
                    media(sort: SCORE_DESC, type: $type, isAdult: false, format_in: $format) {
                        ...media
                    }
                }
            }
            
            fragment media on Media {
                id
                type
                format
            }
            `,
            variables: {
                type: type,
                season: this.getCurrentSeason(),
                seasonYear: new Date(Date.now()).getFullYear(),
                format: formats,
                page: PAGE,
                perPage: PER_PAGE,
            },
        };

        const req = (await (
            await this.request(this.api, {
                body: JSON.stringify(aniListArgs),
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Origin: "https://anilist.co",
                },
                validateResponse: async (response) => {
                    if (!response.ok) return false;
                    try {
                        const json = (await response.json()) as {
                            data: {
                                trending: {
                                    media: {
                                        id: string;
                                        type: MediaType;
                                        format: MediaFormat;
                                    }[];
                                };
                                season: {
                                    media: {
                                        id: string;
                                        type: MediaType;
                                        format: MediaFormat;
                                    }[];
                                };
                                popular: {
                                    media: {
                                        id: string;
                                        type: MediaType;
                                        format: MediaFormat;
                                    }[];
                                };
                                top: {
                                    media: {
                                        id: string;
                                        type: MediaType;
                                        format: MediaFormat;
                                    }[];
                                };
                            };
                        };
                        if (json.data.trending.media.length > 0 || json.data.season.media.length > 0 || json.data.popular.media.length > 0 || json.data.top.media.length > 0) return true;
                        return false;
                    } catch {
                        return false;
                    }
                },
            })
        ).json()) as {
            data: {
                trending: {
                    media: {
                        id: string;
                        type: MediaType;
                        format: MediaFormat;
                    }[];
                };
                season: {
                    media: {
                        id: string;
                        type: MediaType;
                        format: MediaFormat;
                    }[];
                };
                popular: {
                    media: {
                        id: string;
                        type: MediaType;
                        format: MediaFormat;
                    }[];
                };
                top: {
                    media: {
                        id: string;
                        type: MediaType;
                        format: MediaFormat;
                    }[];
                };
            };
        };

        const data = req?.data;
        if (!data) {
            return undefined;
        }

        return {
            trending: data.trending.media,
            seasonal: data.season.media,
            popular: data.popular.media,
            top: data.top.media,
        };
    }

    override async fetchIds(formats: MediaFormat[]): Promise<string[] | undefined> {
        const ids: string[] = [];

        const animeIds = await this.fetchAnimeIds(formats);
        if (animeIds) ids.push(...animeIds);

        const mangaIds = await this.fetchMangaIds(formats);
        if (mangaIds) ids.push(...mangaIds);

        return ids;
    }

    private async fetchAnimeIds(formats: MediaFormat[]): Promise<string[] | undefined> {
        const idList = await (await fetch("https://raw.githubusercontent.com/5H4D0WILA/IDFetch/main/ids.txt")).text();
        const list: string[] = idList.split("\n");

        const chunkSize = 10;

        const ids: string[] = [];

        for (let i = 0; i < list.length; i += chunkSize) {
            const now = Date.now();
            const chunk = list.slice(i, i + chunkSize);
            const queries: string[] = [];

            await Promise.all(
                chunk.map((id) =>
                    queries.push(`
            anime${id}:Page(page: 0, perPage: 10){
                media(id:${id}){
                    id
                    type
                    format
                }
            }
            `),
                ),
            );

            const results = await this.batchRequest(queries, 5).catch(() => {
                return [] as IBatchRequestResult[];
            });

            if (results.some((result) => result === null)) {
                // Too many requests.
                continue;
            }

            const batchResults: IMediaEntry[] = (results as IBatchRequestResult[])
                .reduce<IMediaEntry[]>((accumulator: IMediaEntry[], currentObject: IBatchRequestResult) => {
                    const mediaArrays = Object.values(currentObject)
                        .map((entry) => entry.media)
                        .filter((media): media is IMediaEntry => media !== null);
                    return accumulator.concat(...mediaArrays);
                }, [])
                .filter(Boolean);

            for (const media of batchResults) {
                if (formats.includes(media.format)) ids.push(String(media.id));
            }

            console.log(`Finished chunk ${i / chunkSize + 1}/${Math.ceil(list.length / chunkSize)} in ${Date.now() - now}ms`);
        }

        return ids;
    }

    private async fetchMangaIds(formats: MediaFormat[]): Promise<string[] | undefined> {
        const req1 = await fetch("https://anilist.co/sitemap/manga-0.xml");
        const data1 = await req1.text();
        const req2 = await fetch("https://anilist.co/sitemap/manga-1.xml");
        const data2 = await req2.text();

        const ids1 = data1.match(/manga\/([0-9]+)/g)?.map((id) => {
            return id.replace("manga/", "");
        });

        const ids2 = data2.match(/manga\/([0-9]+)/g)?.map((id) => {
            return id.replace("manga/", "");
        });
        const list = ids1?.concat(ids2 as string[]) ?? [];

        const chunkSize = 10;

        const ids: string[] = [];

        for (let i = 0; i < list.length; i += chunkSize) {
            const now = Date.now();
            const chunk = list.slice(i, i + chunkSize);
            const queries: string[] = [];

            await Promise.all(
                chunk.map((id) =>
                    queries.push(`
            anime${id}:Page(page: 0, perPage: 10){
                media(id:${id}){
                    id
                    type
                    format
                }
            }
            `),
                ),
            );

            const results = await this.batchRequest(queries, 5).catch(() => {
                return [] as IBatchRequestResult[];
            });

            if (results.some((result) => result === null)) {
                // Too many requests.
                continue;
            }

            const batchResults: IMediaEntry[] = (results as IBatchRequestResult[])
                .reduce<IMediaEntry[]>((accumulator: IMediaEntry[], currentObject: IBatchRequestResult) => {
                    const mediaArrays = Object.values(currentObject)
                        .map((entry) => entry.media)
                        .filter((media): media is IMediaEntry => media !== null);
                    return accumulator.concat(...mediaArrays);
                }, [])
                .filter(Boolean);

            for (const media of batchResults) {
                if (formats.includes(media.format)) ids.push(String(media.id));
            }

            console.log(`Finished chunk ${i / chunkSize + 1}/${Math.ceil(list.length / chunkSize)} in ${Date.now() - now}ms`);
        }

        return ids;
    }

    public async batchRequest(queries: string[], maxQueries: number): Promise<IBatchRequestResult[]> {
        const results: IBatchRequestResult[] = [];

        const processBatch = async (batch: string[]) => {
            const currentQuery = `{${batch.join("\n")}}`;
            const result = await this.executeGraphQLQuery(currentQuery);
            if (result) {
                const data = (await result.json()) as IGraphQLResponse;
                results.push(data.data);
            }
        };

        const batchedQueries: string[][] = [];
        for (let i = 0; i < queries.length; i += maxQueries) {
            batchedQueries.push(queries.slice(i, i + maxQueries));
        }

        for await (const batch of batchedQueries) {
            await processBatch(batch);
        }

        return results;
    }

    private async executeGraphQLQuery(query: string) {
        const variables = {};
        return await this.request(this.api, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
                origin: "graphql.anilist.co",
            },
            body: JSON.stringify({
                query,
                variables,
            }),
        }).catch((err) => {
            console.error(err);
            return null;
        });
    }

    override async proxyCheck(proxyURL: string): Promise<boolean | undefined> {
        try {
            const aniListArgs: { query: string; variables: { [key: string]: string | number | string[] | number[] } } = {
                query: `
                query ($page: Int, $perPage: Int, $search: String, $type: MediaType, $format: [MediaFormat]) {
                    Page(page: $page, perPage: $perPage) {
                        pageInfo {
                            total
                            currentPage
                            lastPage
                            hasNextPage
                            perPage
                        }
                        media(type: $type, format_in: $format, search: $search) {
                            ${this.query}
                        }
                    }
                }
                `,
                variables: {
                    search: "Mushoku Tensei",
                    type: MediaType.ANIME,
                    format: [MediaFormat.TV],
                    page: 0,
                    perPage: 10,
                },
            };

            const req = await this.request(this.api, {
                proxy: proxyURL,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    origin: "graphql.anilist.co",
                },
                body: JSON.stringify(aniListArgs),
            });
            const json = (await req?.json()) as { data: { Page: { media: IMedia[] } } };
            const media = json?.data?.Page.media;

            if (!media) return false;
            return media.length > 0;
        } catch {
            return false;
        }
    }

    public query = `
    id
    idMal
    title {
        romaji
        english
        native
        userPreferred
    }
    coverImage {
        extraLarge
        large
        color
    }
    bannerImage
    startDate {
        year
        month
        day
    }
    endDate {
        year
        month
        day
    }
    description
    season
    seasonYear
    type
    format
    status(version: 2)
    episodes
    duration
    chapters
    volumes
    genres
    synonyms
    source(version: 3)
    isAdult
    meanScore
    averageScore
    popularity
    favourites
    countryOfOrigin
    isLicensed
    characters {
        edges {
            voiceActors {
                id
                name {
                    first
                    middle
                    last
                    full
                    native
                }
                image {
                    large
                }
                gender
                age
                dateOfBirth {
                    year
                    month
                    day
                }
                languageV2
            }
            role
            node {
                id
                name {
                    first
                    middle
                    last
                    full
                    native
                    alternative
                    alternativeSpoiler
                }
                age
                image {
                    large
                }
                description
                modNotes
                siteUrl
            }
        }
    }
    relations {
        edges {
            id
            relationType(version: 2)
            node {
                id
                title {
                    english
                    romaji
                    native
                }
                format
                type
                status(version: 2)
                bannerImage
                coverImage {
                    large
                }
            }
        }
    }
    streamingEpisodes {
        title
        thumbnail
        url
    }
    trailer {
        id
        site
    }
    tags {
        id
        name
    }
    `;
}

type MediaSource = "ANIME" | "BOOK" | "CARD_GAME" | "COMIC" | "DOUJINSHI" | "GAME" | "LIGHT_NOVEL" | "MANGA" | "MUSIC" | "ONE_SHOT" | "ORIGINAL" | "OTHER" | "PICTURE_BOOK" | "RADIO" | "TV" | "UNKNOWN" | "VIDEO_GAME" | "VISUAL_NOVEL" | "WEB_MANGA";

interface IMediaTitle {
    english?: string;
    romaji: string;
    native: string;
    userPreferred: string;
}

interface IMediaCoverImage {
    extraLarge: string;
    large: string;
    color?: string;
}

interface IMediaDate {
    year: number;
    month: number;
    day: number;
}

interface IMediaVoiceActor {
    id: number;
    name: {
        first: string;
        middle: string;
        last: string;
        full: string;
        native: string;
    };
    languageV2: string;
    image: {
        large: string;
    };
    gender: string | null;
    age: number | null;
    dateOfBirth: {
        year: number | null;
        month: number | null;
        day: number | null;
    };
}

interface IMediaCharacterNode {
    id: number;
    name: {
        first: string;
        middle: string;
        last: string;
        full: string;
        native: string;
        alternative: string[];
        alternativeSpoiler: string[];
    };
    age: number | null;
    image: {
        large: string;
    };
    description: string;
    modNotes: string;
    siteUrl: string;
}

interface IMediaCharacterEdge {
    role: string;
    voiceActors: [IMediaVoiceActor];
    node: IMediaCharacterNode;
}

interface IMediaStudioEdge {
    isMain: boolean;
    node: {
        id: number;
        name: string;
    };
}

interface IMediaStreamingEpisode {
    title?: string;
    thumbnail?: string;
    url?: string;
}

interface IMediaTag {
    id: number;
    name: string;
}

interface IMedia {
    id: number;
    idMal: number;
    title: IMediaTitle;
    coverImage: IMediaCoverImage;
    bannerImage: string;
    startDate: IMediaDate;
    endDate: IMediaDate;
    description: string;
    season: "WINTER" | "SPRING" | "SUMMER" | "FALL";
    seasonYear: number;
    type: MediaType;
    format: MediaFormat;
    status: "FINISHED" | "RELEASING" | "NOT_YET_RELEASED" | "CANCELLED";
    episodes?: number;
    duration?: number;
    chapters?: number;
    volumes?: number;
    genres: string[];
    synonyms: string[];
    source: MediaSource;
    isAdult: boolean;
    meanScore: number;
    averageScore: number;
    popularity: number;
    favourites: number;
    countryOfOrigin: string;
    isLicensed: boolean;
    airingSchedule: {
        edges: {
            node: {
                airingAt?: number;
                timeUntilAiring?: number;
                episode?: number;
            };
        };
    };
    relations: {
        edges: [IRelationsNode];
    };
    characters: {
        edges: [IMediaCharacterEdge];
    };
    studios: {
        edges: IMediaStudioEdge[];
    };
    streamingEpisodes: [IMediaStreamingEpisode];
    trailer: {
        id: string;
        site: string;
    };
    tags: [IMediaTag];
}

interface IRelationsNode {
    id: number;
    relationType: string;
    node: {
        id: number;
        title: {
            english: string | null;
            romaji: string | null;
            native: string | null;
        };
        format: MediaFormat;
        type: MediaType;
        status: string;
        bannerImage: string;
        coverImage: {
            large: string;
        };
    };
}

interface IGraphQLResponse {
    data: IBatchRequestResult;
}

interface IBatchRequestResult {
    [key: string]: {
        media: {
            id: number;
            type: MediaType;
            format: MediaFormat;
        } | null;
    };
}

interface IMediaEntry {
    id: number;
    type: MediaType;
    format: MediaFormat;
}
