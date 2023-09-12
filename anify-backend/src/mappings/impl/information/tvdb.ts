import InformationProvider from ".";
import { Format, Season } from "../../../types/enums";
import { Anime, AnimeInfo, Character, Manga, MangaInfo, MediaInfoKeys } from "../../../types/types";

export default class TVDB extends InformationProvider<Anime | Manga, AnimeInfo | MangaInfo> {
    override id = "tvdb";
    override url = "https://thetvdb.com";

    private tvdbApiUrl = "https://api4.thetvdb.com/v4";

    private apiKeys = ["f5744a13-9203-4d02-b951-fbd7352c1657", "8f406bec-6ddb-45e7-8f4b-e1861e10f1bb", "5476e702-85aa-45fd-a8da-e74df3840baf", "51020266-18f7-4382-81fc-75a4014fa59f"];

    override get priorityArea(): MediaInfoKeys[] {
        return ["bannerImage", "coverImage"];
    }

    override get sharedArea(): MediaInfoKeys[] {
        return ["synonyms", "genres", "tags", "artwork", "characters"];
    }

    override async info(media: Anime | Manga): Promise<AnimeInfo | MangaInfo | undefined> {
        const tvdbId = media.mappings.find((data) => {
            return data.providerId === "tvdb";
        })?.id;

        if (!tvdbId) return undefined;

        const token = await this.getToken(this.apiKeys[Math.floor(Math.random() * this.apiKeys.length)]);

        const data: Response | undefined = await this.request(
            `${this.tvdbApiUrl}${tvdbId}/extended`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
            false,
        ).catch(() => {
            return undefined;
        });

        if (!data) return undefined;

        if (data.ok) {
            const info = (await data.json()).data;

            const img = info.image;
            const aliases = info.aliases;
            const firstAired = new Date(info.firstAired);

            const averageRunTime = info.averageRuntime;

            const characters: Character[] = (info.characters ?? [])
                .map((character: any) => {
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
                .filter(Boolean);

            const artwork: Artwork[] = info.artworks;

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

            const airsDays = info.airsDays; // Helpful

            const artworkData = artwork
                .map((art) => {
                    const type = artworkIds.backgrounds.includes(art.type) ? "banner" : artworkIds.banner.includes(art.type) ? "top_banner" : artworkIds.clearLogo.includes(art.type) ? "clear_logo" : artworkIds.poster.includes(art.type) ? "poster" : artworkIds.icon.includes(art.type) ? "icon" : artworkIds.clearArt.includes(art.type) ? "clear_art" : null;
                    if (!type) return;
                    return {
                        type: type,
                        img: art.image,
                        providerId: this.id,
                    };
                })
                .filter(Boolean);

            const hasPrequelRelation = media.relations.some((relation) => relation.relationType === "PREQUEL");

            const coverImage = !hasPrequelRelation ? coverImages[0]?.image ?? media.coverImage ?? null : media.coverImage ?? null;

            return {
                id: media.id,
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
                format: Format.UNKNOWN,
                season: Season.UNKNOWN,
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
                artwork: artworkData as any,
                characters: characters.slice(0, 10),
                totalChapters: null,
                totalVolumes: null,
                type: media.type,
            };
        }

        return undefined;
    }

    private async getToken(key: string): Promise<string | undefined> {
        const data: Response | undefined = await this.request(
            `${this.tvdbApiUrl}/login`,
            {
                body: JSON.stringify({
                    apikey: `${key}`,
                }),
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            },
            false,
        ).catch((err) => {
            console.error(err);
            return undefined;
        });
        if (!data) return undefined;

        if (data.ok) {
            return (await data.json()).data.token as string;
        }

        return undefined;
    }
}

interface Artwork {
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
