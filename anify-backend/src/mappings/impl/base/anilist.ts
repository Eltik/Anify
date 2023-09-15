import BaseProvider from ".";
import { Format, Genres, MediaStatus, Season, Type } from "../../../types/enums";
import { AnimeInfo, Artwork, Character, MangaInfo, Relations } from "../../../types/types";

export default class AniListBase extends BaseProvider {
    override id = "anilist";
    override url = "https://anilist.co";

    override formats: Format[] = [Format.MOVIE, Format.ONA, Format.OVA, Format.SPECIAL, Format.TV, Format.TV_SHORT, Format.NOVEL];

    private api = "https://graphql.anilist.co";

    override async search(query: string, type: Type, formats: Format[], page: number, perPage: number): Promise<AnimeInfo[] | MangaInfo[] | undefined> {
        const aniListArgs: { query: string; variables: { [key: string]: any } } = {
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

        const req = await this.request(
            this.api,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    origin: "graphql.anilist.co",
                },
                body: JSON.stringify(aniListArgs),
            },
            true,
        );
        const json = await req?.json();
        const media = json.data.Page.media;

        if (type === Type.ANIME) {
            return media.map((data: Media) => {
                const artwork: Artwork[] = [];

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

                const characters: Character[] = [];
                const relations: Relations[] = [];

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
                    currentEpisode: data.status === MediaStatus.FINISHED || data.status === MediaStatus.CANCELLED ? data.episodes ?? 0 : 0,
                    duration: data.duration ?? null,
                    coverImage: data.coverImage.extraLarge ?? null,
                    bannerImage: data.bannerImage ?? null,
                    popularity: Number(data.popularity),
                    synonyms: data.synonyms ?? [],
                    totalEpisodes: data.episodes ?? 0,
                    color: null,
                    status: data.status,
                    season: data.season as Season,
                    genres: (data.genres as Genres[]) ?? [],
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
            });
        } else {
            return media.map((data: Media) => {
                const artwork: Artwork[] = [];

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

                const characters: Character[] = [];
                const relations: Relations[] = [];

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
                    genres: (data.genres as Genres[]) ?? [],
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
            });
        }
    }

    override async searchAdvanced(query: string, type: Type, formats: Format[], page: number, perPage: number, genres: Genres[] = [], genresExcluded: Genres[] = [], year = 0, tags: string[] = [], tagsExcluded: string[] = []): Promise<AnimeInfo[] | MangaInfo[] | undefined> {
        const aniListArgs: { query: string; variables: { [key: string]: any } } = {
            query: `
            query ($page: Int, $perPage: Int, $search: String, $type: MediaType, $format: [MediaFormat], $genres: [String], $genresExcluded: [String], $tags: [String], $tagsExcluded: [String]) {
                Page(page: $page, perPage: $perPage) {
                    pageInfo {
                        total
                        currentPage
                        lastPage
                        hasNextPage
                        perPage
                    }
                    media(type: $type, format_in: $format, search: $search, genre_in: $genres, genre_not_in: $genresExcluded, tag_in: $tags, tag_not_in: $tagsExcluded) {
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
                tags: tags.length > 0 ? tags : undefined,
                tagsExclude: tagsExcluded,
            },
        };

        if (tags.length === 0) delete aniListArgs.variables.tags;

        const req = await this.request(
            this.api,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    origin: "graphql.anilist.co",
                },
                body: JSON.stringify(aniListArgs),
            },
            true,
        );
        const json = await req?.json();
        const media = json.data.Page.media;

        if (type === Type.ANIME) {
            return media.map((data: Media) => {
                const artwork: Artwork[] = [];

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

                const characters: Character[] = [];
                const relations: Relations[] = [];

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
                    currentEpisode: data.status === MediaStatus.FINISHED || data.status === MediaStatus.CANCELLED ? data.episodes ?? 0 : 0,
                    duration: data.duration ?? null,
                    coverImage: data.coverImage.extraLarge ?? null,
                    bannerImage: data.bannerImage ?? null,
                    popularity: Number(data.popularity),
                    synonyms: data.synonyms ?? [],
                    totalEpisodes: data.episodes ?? 0,
                    color: null,
                    status: data.status,
                    season: data.season as Season,
                    genres: (data.genres as Genres[]) ?? [],
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
            });
        } else {
            return media.map((data: Media) => {
                const artwork: Artwork[] = [];

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

                const characters: Character[] = [];
                const relations: Relations[] = [];

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
                    genres: (data.genres as Genres[]) ?? [],
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
            });
        }
    }

    override getCurrentSeason(): Season {
        return Season.SUMMER;
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

        const req = await this.request(
            this.api,
            {
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
            },
            true,
        );
        const data: Media = (await req.json()).data?.Media;
        if (!data) return undefined;

        const characters: Character[] = [];
        const relations: Relations[] = [];

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
            currentEpisode: data.status === MediaStatus.FINISHED || data.status === MediaStatus.CANCELLED ? data.episodes ?? 0 : 0,
            duration: data.duration ?? null,
            coverImage: data.coverImage.extraLarge ?? null,
            bannerImage: data.bannerImage ?? null,
            popularity: Number(data.popularity),
            synonyms: data.synonyms ?? [],
            totalEpisodes: data.episodes ?? 0,
            totalChapters: data.chapters ?? 0,
            color: null,
            status: data.status as MediaStatus,
            season: data.season as Season,
            genres: (data.genres as Genres[]) ?? [],
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
            totalVolumes: data.volumes ?? 0,
        };
    }

    override async fetchSeasonal(type: Type, formats: Format[]): Promise<{ trending: AnimeInfo[] | MangaInfo[]; seasonal: AnimeInfo[] | MangaInfo[]; popular: AnimeInfo[] | MangaInfo[]; top: AnimeInfo[] | MangaInfo[] } | undefined> {
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
                ${this.query}
            }
            `,
            variables: {
                type: type,
                season: this.getCurrentSeason(),
                seasonYear: 2023,
                format: formats,
                page: 0,
                perPage: 20,
            },
        };

        const req = await (
            await this.request(
                this.api,
                {
                    body: JSON.stringify(aniListArgs),
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Origin: "https://anilist.co",
                    },
                },
                true,
            )
        ).json();

        const data = req?.data;
        if (!data) {
            return undefined;
        }

        const trending = data.trending.media?.map((data: Media) => {
            return this.anilistMediaGenerator(data);
        });

        const seasonal = data.season.media?.map((data: Media) => {
            return this.anilistMediaGenerator(data);
        });

        const popular = data.popular.media?.map((data: Media) => {
            return this.anilistMediaGenerator(data);
        });

        const top = data.top.media?.map((data: Media) => {
            return this.anilistMediaGenerator(data);
        });

        return {
            trending,
            seasonal,
            popular,
            top,
        };
    }

    override async fetchIds(formats: Format[]): Promise<string[] | undefined> {
        const ids: string[] = [];

        const animeIds = await this.fetchAnimeIds(formats);
        if (animeIds) ids.push(...animeIds);

        const mangaIds = await this.fetchMangaIds(formats);
        if (mangaIds) ids.push(...mangaIds);

        return ids;
    }

    private async fetchAnimeIds(formats: Format[]): Promise<string[] | undefined> {
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

            const results: any[] = await this.batchRequest(queries, 5).catch((err) => {
                return [];
            });

            if (results.includes(null)) {
                // Too many requests.
                continue;
            }

            const batchResults: { id: number; type: Type; format: Format }[] = results
                .reduce((accumulator, currentObject) => {
                    const mediaArrays = Object.values(currentObject).map((anime: any) => anime.media);
                    return accumulator.concat(...mediaArrays);
                }, [])
                .map((x: any) => {
                    if (!x) return null;
                    return x;
                })
                .filter(Boolean);

            for (const media of batchResults) {
                if (formats.includes(media.format)) ids.push(String(media.id));
            }

            console.log(`Finished chunk ${i / chunkSize + 1}/${Math.ceil(list.length / chunkSize)} in ${Date.now() - now}ms`);
        }

        return ids;
    }

    private async fetchMangaIds(formats: Format[]): Promise<string[] | undefined> {
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

            const results: any[] = await this.batchRequest(queries, 5).catch((err) => {
                return [];
            });

            if (results.includes(null)) {
                // Too many requests.
                continue;
            }

            const batchResults: { id: number; type: Type; format: Format }[] = results
                .reduce((accumulator, currentObject) => {
                    const mediaArrays = Object.values(currentObject).map((anime: any) => anime.media);
                    return accumulator.concat(...mediaArrays);
                }, [])
                .map((x: any) => {
                    if (!x) return null;
                    return x;
                })
                .filter(Boolean);

            for (const media of batchResults) {
                if (formats.includes(media.format)) ids.push(String(media.id));
            }

            console.log(`Finished chunk ${i / chunkSize + 1}/${Math.ceil(list.length / chunkSize)} in ${Date.now() - now}ms`);
        }

        return ids;
    }

    private anilistMediaGenerator(data: any): AnimeInfo | MangaInfo {
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
            genres: (data.genres as Genres[]) ?? [],
            rating: data.meanScore ? data.meanScore / 10 : null,
            description: data.description ?? null,
            type: data.type,
            format: data.format,
            countryOfOrigin: data.countryOfOrigin ?? null,
            year: data.seasonYear ?? data.startDate?.year ?? null,
            tags: data.tags.map((tag: { name: string }) => tag.name),
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
            characters: [],
            currentEpisode: data.status === MediaStatus.FINISHED || data.status === MediaStatus.CANCELLED ? data.episodes ?? 0 : 0,
            duration: data.duration ?? null,
            relations: [],
            season: data.season as Season,
            trailer: null,
            totalEpisodes: data.episodes ?? 0,
        };
    }

    public async batchRequest(queries: string[], maxQueries: number): Promise<any[]> {
        const results: any[] = [];

        const processBatch = async (batch: string[]) => {
            const currentQuery = `{${batch.join("\n")}}`;
            const result = await this.executeGraphQLQuery(currentQuery);
            if (result) {
                const data = await result.json();
                results.push(...Object.values(data));
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
        return await this.request(
            this.api,
            {
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
            },
            true,
        ).catch((err) => {
            console.error(err);
            return null;
        });
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

interface Media {
    id: number;
    idMal: number;
    title: {
        english?: string;
        romaji: string;
        native: string;
        userPreferred: string;
    };
    coverImage: {
        extraLarge: string;
        large: string;
        color?: string;
    };
    bannerImage: string;
    startDate: {
        year: number;
        month: number;
        day: number;
    };
    endDate: {
        year: number;
        month: number;
        day: number;
    };
    description: string;
    season: "WINTER" | "SPRING" | "SUMMER" | "FALL";
    seasonYear: number;
    type: Type;
    format: Format;
    status: "FINISHED" | "RELEASING" | "NOT_YET_RELEASED" | "CANCELLED";
    episodes?: number;
    duration?: number;
    chapters?: number;
    volumes?: number;
    genres: string[];
    synonyms: string[];
    source: "ORIGINAL" | "LIGHT_NOVEL" | "VISUAL_NOVEL" | "VIDEO_GAME" | "OTHER" | "NOVEL" | "MANGA" | "DOUJINSHI" | "ANIME" | "WEB_MANGA" | "BOOK" | "CARD_GAME" | "COMIC" | "GAME" | "MUSIC" | "NOVEL" | "ONE_SHOT" | "OTHER" | "PICTURE_BOOK" | "RADIO" | "TV" | "UNKNOWN";
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
                airingAt?: any;
                timeUntilAiring?: any;
                episode?: any;
            };
        };
    };
    relations: {
        edges: [RelationsNode];
    };
    characters: {
        edges: [
            {
                role: string;
                voiceActors: [
                    {
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
                    },
                ];
                node: {
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
                };
            },
        ];
    };
    studios: {
        edges: {
            isMain: boolean;
            node: {
                id: number;
                name: string;
            };
        };
    };
    streamingEpisodes: [
        {
            title?: string;
            thumbnail?: string;
            url?: string;
        },
    ];
    trailer: {
        id: string;
        site: string;
    };
    tags: [{ id: number; name: string }];
}

interface RelationsNode {
    id: number;
    relationType: string;
    node: {
        id: number;
        title: {
            english: string | null;
            romaji: string | null;
            native: string | null;
        };
        format: Format;
        type: Type;
        status: string;
        bannerImage: string;
        coverImage: {
            large: string;
        };
    };
}

interface Schedule {
    id: number;
    episode: number;
    airingAt: number;
    media: {
        id: number;
        idMal: number;
        title: {
            romaji: string;
            native: string;
            english: string | null;
        };
        startDate: {
            year: number;
            month: number;
            day: number;
        };
        endDate: {
            year: number;
            month: number;
            day: number;
        };
        status: string;
        season: string | null;
        format: string;
        genres: string[];
        synonyms: string[];
        duration: number | null;
        popularity: number;
        episodes: number;
        source: string;
        countryOfOrigin: string;
        hashtag: string | null;
        averageScore: number | null;
        siteUrl: string;
        description: string | null;
        bannerImage: string | null;
        isAdult: boolean;
        coverImage: {
            extraLarge: string;
            color: string;
        };
        trailer: string | null;
        externalLinks: {
            site: string;
            url: string;
        }[];
        rankings: any[];
        studios: {
            nodes: {
                id: number;
                name: string;
                siteUrl: string;
            }[];
        };
        relations: {
            edges: any[];
        };
    };
}
