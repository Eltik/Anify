import InformationProvider from ".";
import { Genres, MediaStatus, Season } from "../../../types/enums";
import { Anime, AnimeInfo, Artwork, Character, Manga, MangaInfo, MediaInfoKeys, Relations } from "../../../types/types";

export default class AniList extends InformationProvider<Anime | Manga, AnimeInfo | MangaInfo> {
    override id = "anilist";
    override url = "https://anilist.co";

    private api = "https://graphql.anilist.co";

    public needsProxy: boolean = true;
    public useGoogleTranslate: boolean = false;

    public preferredTitle: "english" | "romaji" | "native" = "native";

    override get priorityArea(): MediaInfoKeys[] {
        return ["bannerImage", "relations", "color"];
    }

    override get sharedArea(): MediaInfoKeys[] {
        return ["synonyms", "genres", "tags", "artwork", "characters"];
    }

    override async info(media: Anime | Manga): Promise<AnimeInfo | MangaInfo | undefined> {
        const anilistId = media.mappings.find((data) => {
            return data.providerId === "anilist";
        })?.id;

        if (!anilistId) return undefined;

        const query = `query ($id: Int) {
            Media (id: $id) {
                ${this.query}
            }
        }`;
        const variables = {
            id: anilistId,
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
        });
        //const data: Media = (await req.json()).data.Media;
        const text = await req.text();
        let data: any = undefined;
        try {
            data = JSON.parse(text).data.Media;
        } catch (e) {
            console.log(text);
        }
        if (!data) return undefined;

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

            const existingCharacter = media.characters.find((char) => char.name === character.name);
            if (!existingCharacter) {
                characters.push({
                    voiceActor: {
                        name: character.voiceActors[0]?.name?.full ?? null,
                        image: character.voiceActors[0]?.image?.large ?? null,
                    },
                    image: character.node.image.large,
                    name: character.node.name.full,
                });
            }
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
            totalVolumes: data.volumes ?? 0,
            color: data.coverImage.color ?? null,
            status: data.status as MediaStatus,
            season: data.season as Season,
            genres: (data.genres as Genres[]) ?? [],
            rating: data.meanScore ? data.meanScore / 10 : null,
            description: data.description ?? null,
            type: data.type,
            format: data.format,
            year: data.seasonYear ?? data.startDate?.year ?? null,
            countryOfOrigin: data.countryOfOrigin ?? null,
            tags: data.tags.map((tag: { name: string }) => tag.name),
            relations: relations,
            artwork,
            characters,
        };
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

/*
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
*/
