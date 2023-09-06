import MetaProvider from ".";
import { Format } from "../../../types/enums";
import { Result } from "../../../types/types";

export default class TMDB extends MetaProvider {
    override rateLimit = 500;
    override id = "tmdb";
    override url = "https://themoviedb.org";
    override formats: Format[] = [Format.TV, Format.MOVIE, Format.ONA, Format.SPECIAL, Format.TV_SHORT, Format.OVA];

    private tmdbApiUrl = "https://api.themoviedb.org/3";
    private apiKey = "5201b54eb0968700e693a30576d7d4dc";

    override async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        const results: Result[] = [];

        const page = 1;
        const searchUrl = `/search/multi?api_key=${this.apiKey}&language=en-US&page=${page}&include_adult=false&query=${encodeURIComponent(query)}`;

        const data = await (await this.request(this.tmdbApiUrl + searchUrl)).json();

        if (!data) return undefined;

        if (data.results.length > 0) {
            data.results.forEach((result: TMDBResult) => {
                if (result.media_type === "tv") {
                    results.push({
                        id: `/tv/${result.id}`,
                        title: result.title || result.name,
                        altTitles: [result.original_title || result.original_name, result.title || result.name],
                        img: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                        format: Format.UNKNOWN,
                        year: result.first_air_date ? new Date(result.first_air_date).getFullYear() : 0,
                        providerId: this.id,
                    });
                } else if (result.media_type === "movie") {
                    results.push({
                        id: `/movie/${result.id}`,
                        title: result.title || result.name,
                        altTitles: [result.original_title || result.original_name, result.title || result.name],
                        img: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                        format: Format.MOVIE,
                        year: result.first_air_date ? new Date(result.first_air_date).getFullYear() : 0,
                        providerId: this.id,
                    });
                }
            });
            return results;
        } else {
            return results;
        }
    }
}

type TMDBResult = {
    adult: boolean;
    backdrop_path: string | null;
    id: number;
    title?: string;
    name: string;
    original_language: string;
    original_title?: string;
    original_name: string;
    overview: string;
    poster_path: string | null;
    media_type: string;
    genre_ids: number[];
    popularity: number;
    first_air_date: string;
    vote_average: number;
    vote_count: number;
    origin_country: string[];
};

type Episode = {
    air_date: string;
    episode_number: number;
    episode_type: string;
    id: number;
    name: string;
    overview: string;
    production_code: string;
    runtime: number;
    season_number: number;
    show_id: number;
    still_path: string;
    vote_average: number;
    vote_count: number;
    crew: {
        job: string;
        department: string;
        credit_id: string;
        adult: boolean;
        gender: number;
        id: number;
        known_for_department: string;
        name: string;
        original_name: string;
        popularity: number;
        profile_path: string | null;
    }[];
    guest_stars: {
        character: string;
        credit_id: string;
        order: number;
        adult: boolean;
        gender: number;
        id: number;
        known_for_department: string;
        name: string;
        original_name: string;
        popularity: number;
        profile_path: string | null;
    }[];
};
