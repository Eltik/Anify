import MetaProvider from ".";
import { Format, Type } from "../../../types/enums";
import { Result } from "../../../types/types";

export default class AniListMeta extends MetaProvider {
    override id = "anilist";
    override url = "https://anilist.co";

    override rateLimit = 500;
    override formats: Format[] = [Format.TV, Format.MOVIE, Format.ONA, Format.SPECIAL, Format.TV_SHORT, Format.OVA, Format.MANGA, Format.ONE_SHOT, Format.NOVEL];

    private api = "https://graphql.anilist.co";

    override async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        const results: Result[] = [];

        const aniListArgs = {
            query: `
            query($page: Int, $perPage: Int, $search: String, $format: [MediaFormat]) {
                Page(page: $page, perPage: $perPage) {
                    pageInfo {
                        total
                        currentPage
                        lastPage
                        hasNextPage
                        perPage
                    }
                    media(format_in: $format, search: $search) {
                        ${this.query}
                    }
                }
            }
            `,
            variables: {
                search: query,
                format: format ? [format] : null,
                page: 0,
                perPage: 15,
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

        media.map((data: Media) => {
            results.push({
                id: String(data.id),
                altTitles: data.synonyms.concat(Object.values(data.title)),
                title: data.title.english ?? data.title.romaji ?? data.title.native,
                format: data.format,
                img: data.coverImage.extraLarge,
                providerId: this.id,
                year: data.seasonYear ?? data.startDate.year ?? 0,
            });
        });

        return results;
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
