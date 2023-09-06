import InformationProvider from ".";
import { Format, Genres, MediaStatus, Season } from "../../../types/enums";
import { Anime, AnimeInfo, Artwork, Manga, MangaInfo, MediaInfoKeys } from "../../../types/types";

export default class MAL extends InformationProvider<Anime | Manga, AnimeInfo | MangaInfo> {
    override id = "mal";
    override url = "https://myanimelist.net";

    private api = "https://api.jikan.moe/v4";

    override get priorityArea(): MediaInfoKeys[] {
        return [];
    }

    override get sharedArea(): MediaInfoKeys[] {
        return ["synonyms", "genres", "artwork"];
    }

    override async info(media: Anime | Manga): Promise<AnimeInfo | MangaInfo | undefined> {
        const malId = media.mappings.find((data) => {
            return data.providerId === "mal";
        })?.id;

        if (!malId) return undefined;

        const req = await this.request(
            `${this.api}/${media.type.toLowerCase()}/${malId}/full`,
            {
                headers: {
                    origin: "https://jikan.moe",
                },
            },
            true,
        );

        if (!req.ok) return undefined;
        const jikanResponse = await req.json();

        const data: JikanResponse = jikanResponse.data;

        if (!data) return undefined;

        const artwork: Artwork[] = [];

        if (data.images?.jpg?.image_url)
            artwork.push({
                type: "poster",
                img: data.images.jpg.image_url,
                providerId: this.id,
            });

        return {
            id: String(data.mal_id),
            title: {
                english: data.title_english ?? null,
                romaji: data.title ?? null,
                native: data.title_japanese ?? null,
            },
            currentEpisode: data.status === "completed" ? data.episodes : null,
            trailer: data.trailer ? data.trailer.url : null,
            coverImage: data.images?.jpg?.large_image_url ?? data.images?.jpg?.image_url ?? data.images?.jpg?.small_image_url ?? null,
            bannerImage: null,
            color: null,
            totalEpisodes: data.episodes ?? 0,
            status: data.status ? ((data.status as string).toLowerCase() === "not yet aired" ? MediaStatus.NOT_YET_RELEASED : (data.status as string).toLowerCase() === "currently airing" ? MediaStatus.RELEASING : (data.status as string).toLowerCase() === "finished airing" ? MediaStatus.FINISHED : null) : null,
            popularity: data.popularity,
            synonyms: data.title_synonyms?.filter((s) => s?.length) ?? [],
            season: data.season ? ([(data.season as string).toUpperCase()] as unknown as Season) : Season.UNKNOWN,
            genres: data.genres ? (data.genres.map((g) => g.name) as Genres[]) : [],
            description: data.synopsis ?? null,
            rating: data.score ?? null,
            year: data.year ?? null,
            duration: data.duration ? Number.parseInt(data.duration.replace("min per ep", "").trim()) : null,
            format: data.type.toUpperCase() as Format,
            countryOfOrigin: null,
            tags: [],
            relations: [],
            artwork,
            characters: [],
            totalChapters: null,
            totalVolumes: null,
            type: media.type,
        };
    }
}

type JikanResponse = {
    mal_id: number;
    url: string;
    title: string;
    title_english: string | null;
    title_japanese: string | null;
    title_synonyms: string[];
    type: string;
    status: string;
    synopsis: string | null;
    images: {
        jpg: {
            image_url: string | null;
            small_image_url: string | null;
            large_image_url: string | null;
        };
        webp: {
            image_url: string | null;
            small_image_url: string | null;
            large_image_url: string | null;
        };
    };
    duration: string;
    episodes: number | null;
    popularity: number | null;
    score: number | null;
    season: string;
    year: number | null;
    genres: { name: string }[];
    trailer: {
        youtube_id: string | null;
        url: string | null;
        embed_url: string | null;
        images: {
            image_url: string | null;
            small_image_url: string | null;
            medium_image_url: string | null;
            large_image_url: string | null;
            maximum_image_url: string | null;
        };
    };
    approved: boolean;
    titles: {
        type: string;
        title: string;
    }[];
};
