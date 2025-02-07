import MetaProvider from "..";
import { IProviderResult, MediaFormat, MediaType } from "../../../../types";

export default class AniListMeta extends MetaProvider {
    override id = "anilist";
    override url = "https://anilist.co";

    public needsProxy: boolean = true;
    public useGoogleTranslate: boolean = false;

    override rateLimit = 0;
    override maxConcurrentRequests: number = -1;
    override formats: MediaFormat[] = [MediaFormat.TV, MediaFormat.MOVIE, MediaFormat.ONA, MediaFormat.SPECIAL, MediaFormat.TV_SHORT, MediaFormat.OVA, MediaFormat.MANGA, MediaFormat.ONE_SHOT, MediaFormat.NOVEL];

    public preferredTitle: "english" | "romaji" | "native" = "native";

    private api = "https://graphql.anilist.co";

    override async search(query: string, format?: MediaFormat): Promise<IProviderResult[] | undefined> {
        const results: IProviderResult[] = [];

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
                        id
                        synonyms
                        title {
                            english
                            romaji
                            native
                        }
                        coverImage {
                            extraLarge
                        }
                        seasonYear
                        startDate {
                            year
                        }
                        format
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
                    const data = (await response.json()) as { data: { Page: { media: Media[] } } };
                    return data.data !== undefined;
                } catch {
                    return false;
                }
            },
        });
        const json = (await req?.json()) as { data: { Page: { media: Media[] } } };
        const media = json?.data?.Page?.media;

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

    override async proxyCheck(proxyURL: string): Promise<boolean | undefined> {
        try {
            const results: IProviderResult[] = [];

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
                            id
                            synonyms
                            title {
                                english
                                romaji
                                native
                            }
                            coverImage {
                                extraLarge
                            }
                            seasonYear
                            startDate {
                                year
                            }
                            format
                        }
                    }
                }
                `,
                variables: {
                    search: "Mushoku Tensei",
                    format: [MediaFormat.TV],
                    page: 0,
                    perPage: 15,
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
            const json = (await req?.json()) as { data: { Page: { media: Media[] } } };
            const media = json?.data?.Page?.media;

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

            return results.length > 0;
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
    type: MediaType;
    format: MediaFormat;
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
    relations: {
        edges: [RelationsNode];
    };
    studios: {
        edges: {
            isMain: boolean;
            node: {
                id: number;
                name: string;
            };
        }[];
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
        format: MediaFormat;
        type: MediaType;
        status: string;
        bannerImage: string;
        coverImage: {
            large: string;
        };
    };
}
