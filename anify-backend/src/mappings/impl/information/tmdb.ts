import InformationProvider from ".";
import { Format, Season } from "../../../types/enums";
import { Anime, AnimeInfo, Character, Manga, MangaInfo, MediaInfoKeys } from "../../../types/types";

export default class TMDB extends InformationProvider<Anime | Manga, AnimeInfo | MangaInfo> {
    override id = "tmdb";
    override url = "https://themoviedb.org";

    private api = "https://api.themoviedb.org/3";
    private apiKey = "5201b54eb0968700e693a30576d7d4dc";

    override get priorityArea(): MediaInfoKeys[] {
        return ["description"];
    }

    override get sharedArea(): MediaInfoKeys[] {
        return ["genres"];
    }

    override async info(media: Anime | Manga): Promise<AnimeInfo | MangaInfo | undefined> {
        const tmdbId = media.mappings.find((data) => {
            return data.providerId === "tmdb";
        })?.id;

        if (!tmdbId) return undefined;

        const data: Response | undefined = await this.request(`${this.api}${tmdbId}?api_key=${this.apiKey}`).catch(() => {
            return undefined;
        });

        if (!data) return undefined;

        if (data.ok) {
            const info = await data.json();

            return {
                id: tmdbId,
                title: {
                    english: info.name,
                    romaji: null,
                    native: info.original_name,
                },
                currentEpisode: info.last_episode_to_air?.episode_number,
                trailer: null,
                duration: info.episode_run_time[0] ?? null,
                color: null,
                bannerImage: info.backdrop_path ? `https://image.tmdb.org/t/p/w500${info.backdrop_path}` : null,
                coverImage: info.poster_path ? `https://image.tmdb.org/t/p/w500${info.poster_path}` : null,
                status: null,
                format: Format.UNKNOWN,
                season: Season.UNKNOWN,
                synonyms: [],
                description: info.overview,
                year: info.first_air_date ? new Date(info.first_air_date).getFullYear() : 0,
                totalEpisodes: info.number_of_episodes,
                genres: info.genres?.map((genre: { id: number; name: string }) => genre.name),
                rating: info.vote_average,
                popularity: info.popularity,
                countryOfOrigin: info.origin_country[0] ?? null,
                tags: [],
                relations: [],
                artwork: [],
                characters: [],
                totalChapters: null,
                totalVolumes: null,
                type: media.type,
            };
        }

        return undefined;
    }
}
