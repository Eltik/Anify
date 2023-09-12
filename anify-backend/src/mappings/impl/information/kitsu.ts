import InformationProvider from ".";
import { Format, Season } from "../../../types/enums";
import { Anime, AnimeInfo, Artwork, Manga, MangaInfo, MediaInfoKeys } from "../../../types/types";

export default class Kitsu extends InformationProvider<Anime | Manga, AnimeInfo | MangaInfo> {
    override id = "kitsu";
    override url = "https://kitsu.io";

    private kitsuApiUrl = "https://kitsu.io/api/edge";

    override get priorityArea(): MediaInfoKeys[] {
        return ["coverImage"];
    }

    override get sharedArea(): MediaInfoKeys[] {
        return ["synonyms", "genres", "artwork"];
    }

    override async info(media: Anime | Manga): Promise<AnimeInfo | MangaInfo | undefined> {
        const kitsuId = media.mappings.find((data) => {
            return data.providerId === "kitsu";
        })?.id;

        if (!kitsuId) return undefined;

        try {
            const kitsuResponse: KitsuResponse = await (await this.request(`${this.kitsuApiUrl}/${media.type.toLowerCase()}/${kitsuId}`, {}, true)).json();

            const attributes = kitsuResponse?.data?.attributes;

            if (!attributes) return undefined;

            const kitsuGenre = await (await this.request(`${this.kitsuApiUrl}/${media.type.toLowerCase()}/${kitsuId}/genres`, {}, true)).json();
            const genres = kitsuGenre?.data;

            const artwork: Artwork[] = [];

            if (attributes.coverImage?.original)
                artwork.push({
                    type: "banner",
                    img: attributes.coverImage.original,
                    providerId: this.id,
                });
            if (attributes.posterImage?.original)
                artwork.push({
                    type: "poster",
                    img: attributes.posterImage.original,
                    providerId: this.id,
                });

            return {
                id: kitsuId,
                title: {
                    english: attributes.titles.en ?? null,
                    romaji: attributes.titles.en_jp ?? null,
                    native: attributes.titles.ja_jp ?? null,
                },
                currentEpisode: null,
                trailer: null,
                duration: attributes.episodeLength ?? null,
                color: null,
                bannerImage: attributes.coverImage?.original ?? null,
                coverImage: attributes.posterImage?.original ?? null,
                status: null,
                format: Format.UNKNOWN,
                season: Season.UNKNOWN,
                synonyms: [],
                description: attributes.synopsis ?? null,
                year: null,
                totalEpisodes: attributes.episodeCount ?? 0,
                genres: genres ? genres.map((genre: any) => genre.attributes.name) : [],
                rating: attributes.averageRating ? Number.parseFloat((Number.parseFloat(attributes.averageRating) / 10).toFixed(2)) : null,
                popularity: null,
                countryOfOrigin: null,
                tags: [],
                relations: [],
                artwork,
                characters: [],
                totalChapters: null,
                totalVolumes: null,
                type: media.type,
            };
        } catch (e) {
            return undefined;
        }
    }
}

type KitsuResponse = {
    data: {
        attributes: {
            titles: {
                en: string | null;
                en_jp: string | null;
                ja_jp: string | null;
            };
            description: string | null;
            subtype: string;
            status: string;
            showType: string;
            synopsis: string | null;
            episodeLength: number | null;
            posterImage: {
                original: string | null;
            };
            coverImage: {
                original: string | null;
            };
            averageRating: string | null;
            episodeCount: number | null;
        };
    };
};
