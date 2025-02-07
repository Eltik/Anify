import InformationProvider from "..";
import { MediaFormat, MediaSeason, MediaStatus, MediaType, ProviderType } from "../../../../types";
import type { IArtwork, ICharacter, IRelations } from "../../../../types/impl/database/impl/mappings";
import type { IAnime } from "../../../../types/impl/database/impl/schema/anime";
import type { IManga } from "../../../../types/impl/database/impl/schema/manga";
import type { AnimeInfo, MangaInfo, MediaInfoKeys } from "../../../../types/impl/mappings/impl/mediaInfo";

export default class AniList extends InformationProvider<IAnime | IManga, AnimeInfo | MangaInfo> {
    override id = "anilist";
    override url = "https://anilist.co";

    private api = "https://graphql.anilist.co";

    public needsProxy: boolean = true;
    public useGoogleTranslate: boolean = false;

    override rateLimit = 0;
    override maxConcurrentRequests: number = -1;
    override formats: MediaFormat[] = [MediaFormat.TV, MediaFormat.MOVIE, MediaFormat.ONA, MediaFormat.SPECIAL, MediaFormat.TV_SHORT, MediaFormat.OVA, MediaFormat.MANGA, MediaFormat.ONE_SHOT, MediaFormat.NOVEL];

    public preferredTitle: "english" | "romaji" | "native" = "native";

    override get priorityArea(): MediaInfoKeys[] {
        return ["bannerImage", "relations", "color"];
    }

    override get sharedArea(): MediaInfoKeys[] {
        return ["synonyms", "genres", "tags", "artwork", "characters"];
    }

    override async info(media: IAnime | IManga): Promise<AnimeInfo | MangaInfo | undefined> {
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
            validateResponse: async (response) => {
                if (!response.ok) return false;
                try {
                    const data = (await response.json()) as { data: { Media: any } };
                    return data.data.Media !== undefined;
                } catch {
                    return false;
                }
            },
        });
        //const data: Media = (await req.json()).data.Media;
        const text = await req.text();
        let data: any = undefined;
        try {
            data = JSON.parse(text).data.Media;
        } catch {
            console.log(text);
        }
        if (!data) return undefined;

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
            currentEpisode: data.status === MediaStatus.FINISHED || data.status === MediaStatus.CANCELLED ? (data.episodes ?? 0) : 0,
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
            season: data.season as MediaSeason,
            genres: data.genres ?? [],
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
                        id: "108465",
                        providerId: "anilist",
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
                proxy: proxyURL,
            });
            const text = await req.text();
            let data: any = undefined;
            try {
                data = JSON.parse(text).data.Media;
            } catch {
                data = undefined;
            }
            if (!data) return false;

            return true;
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
