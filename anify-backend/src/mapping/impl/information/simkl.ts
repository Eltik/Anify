import { env } from "../../../env";
import InformationProvider, { AnimeInfo, MangaInfo, MediaInfoKeys } from ".";
import { Anime, Artwork, Format, Manga, Season, Type } from "../..";

export default class Simkl extends InformationProvider<Anime | Manga, AnimeInfo | MangaInfo> {
    override id = "simkl";
    override url = "https://simkl.com";

    private simklKey = env.SIMKL_CLIENT_SECRET ?? "";
    private simklClient = env.SIMKL_CLIENT_ID ?? "";
    private simklApiUrl = "https://api.simkl.com";

    override get priorityArea(): MediaInfoKeys[] {
        return [];
    }

    override get sharedArea(): MediaInfoKeys[] {
        return ["synonyms", "genres", "artwork"];
    }

    override async info(media: Anime | Manga): Promise<AnimeInfo | MangaInfo | undefined> {
        const simklId = media.mappings.find((data) => {
            return data.providerId === "simkl";
        })?.id;

        if (!simklId) return undefined;

        const req = await this.request(`${this.simklApiUrl}/anime/${simklId}?extended=full&client_id=${this.simklClient}`);
        const data: Information = await req.json();

        const artwork: Artwork[] = [];

        if (data.poster) artwork.push({ img: `${this.url}/posters/${data.poster}_m.jpg`, type: "poster", providerId: this.id });
        if (data.fanart) artwork.push({ img: `${this.url}/posters/${data.fanart}_m.jpg`, type: "poster", providerId: this.id });

        if (media.type === Type.ANIME) {
            return {
                title: {
                    english: data.en_title,
                    romaji: data.title,
                    native: null,
                },
                synonyms: data.en_title ? [data.en_title] : [],
                artwork: artwork,
                bannerImage: null,
                characters: [],
                color: null,
                countryOfOrigin: data.country,
                coverImage: `${this.url}/posters/${data.poster}_m.jpg`,
                currentEpisode: null,
                description: data.overview,
                duration: data.runtime,
                format: Format.UNKNOWN,
                genres: data.genres ?? [],
                popularity: data.ratings?.simkl?.votes ?? 0,
                rating: data.ratings?.simkl?.rating ?? 0,
                relations: [],
                season: Season.UNKNOWN,
                status: null,
                tags: [],
                trailer: `https://youtube.com/watch?v=${data.trailers?.[0]?.youtube}`,
                year: new Date(data.first_aired).getFullYear(),
                totalEpisodes: data.total_episodes,
            } as AnimeInfo;
        } else {
            return {
                title: {
                    english: data.en_title,
                    romaji: data.title,
                    native: null,
                },
                synonyms: data.en_title ? [data.en_title] : [],
                artwork: artwork,
                bannerImage: null,
                characters: [],
                color: null,
                countryOfOrigin: data.country,
                coverImage: `${this.url}/posters/${data.poster}_m.jpg`,
                description: data.overview,
                format: Format.UNKNOWN,
                genres: data.genres ?? [],
                popularity: data.ratings?.simkl?.votes ?? 0,
                rating: data.ratings?.simkl?.rating ?? 0,
                relations: [],
                year: null,
                status: null,
                totalChapters: 0,
                totalVolumes: 0,
                tags: [],
            } as MangaInfo;
        }
    }

    public async getEpisodeCovers(id: string): Promise<{ episode: number; img: string }[]> {
        const episodeCovers: { episode: number; img: string }[] = [];

        const req = await this.request(`${this.simklApiUrl}/anime/episodes/${id}?client_id=${this.simklClient}`);
        const data: Episode[] = await req.json();

        for (const episode of data) {
            if (!episode.img) continue;
            episodeCovers.push({
                episode: episode.episode,
                img: `https://simkl.in/episodes/${episode.img}_c.jpg`,
            });
        }

        return episodeCovers;
    }
}

interface Information {
    title: string;
    year: number;
    type: string;
    ids: {
        simkl: number;
        slug: string;
        anidb: string;
        ann: string;
        mal: string;
        anfo: string;
        wikien: string;
        allcin: string;
        imdb: string;
        offjp: string;
        crunchyroll: string;
        anilist: string;
        kitsu: string;
        livechart: string;
        anisearch: string;
        animeplanet: string;
    };
    en_title: string | null;
    rank: number;
    poster: string;
    fanart: string;
    first_aired: string;
    airs: {
        day: string;
        time: string;
        timezone: string;
    };
    runtime: number;
    certification: string | null;
    overview: string;
    genres: string[];
    country: string;
    total_episodes: number;
    status: string;
    network: string;
    anime_type: string;
    ratings: {
        simkl: {
            rating: number;
            votes: number;
        };
        imdb: {
            rating: number;
            votes: number;
        };
        mal: {
            rating: number;
            votes: number;
            rank: number;
        };
    };
    trailers: {
        name: string | null;
        youtube: string;
        size: number;
    }[];
    users_recommendations: {
        title: string;
        en_title: string | null;
        year: number;
        poster: string;
        anime_type: string;
        users_percent: string | number;
        users_count: number;
        ids: {
            simkl: number;
            slug: string;
        };
    }[];
}

interface Episode {
    title: string;
    description: string | null;
    episode: number;
    type: string;
    aired: boolean;
    img: string;
    date: string;
    ids: {
        simkl_id: number;
    };
}
