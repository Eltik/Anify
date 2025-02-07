import MetaProvider from "..";
import { IProviderResult, MediaFormat } from "../../../../types";

export default class TMDBMeta extends MetaProvider {
    override id = "tmdb";
    override url = "https://themoviedb.org";

    private api = "https://api.themoviedb.org/3";
    private apiKey = "5201b54eb0968700e693a30576d7d4dc";

    public needsProxy: boolean = true;
    public useGoogleTranslate: boolean = false;

    override rateLimit = 0;
    override maxConcurrentRequests: number = -1;

    override formats: MediaFormat[] = [MediaFormat.TV, MediaFormat.MOVIE, MediaFormat.ONA, MediaFormat.SPECIAL, MediaFormat.TV_SHORT, MediaFormat.OVA];

    override async search(query: string): Promise<IProviderResult[] | undefined> {
        const results: IProviderResult[] = [];

        const page = 1;
        const searchUrl = `/search/multi?api_key=${this.apiKey}&language=en-US&page=${page}&include_adult=false&query=${encodeURIComponent(query)}`;

        const data = (await (
            await this.request(this.api + searchUrl, {
                validateResponse: async (response) => {
                    if (!response.ok) return false;
                    try {
                        const data = (await response.json()) as { results: ITMDBResponse[] };
                        return data.results !== undefined;
                    } catch {
                        return false;
                    }
                },
            })
        ).json()) as { results: ITMDBResponse[] };

        if (!data) return undefined;

        if (data.results.length > 0) {
            data.results.forEach((result) => {
                if (result.media_type === "tv") {
                    results.push({
                        id: `/tv/${result.id}`,
                        title: result.title || result.name,
                        altTitles: [result.original_title || result.original_name, result.title || result.name],
                        img: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                        format: MediaFormat.UNKNOWN,
                        year: result.first_air_date ? new Date(result.first_air_date).getFullYear() : 0,
                        providerId: this.id,
                    });
                } else if (result.media_type === "movie") {
                    results.push({
                        id: `/movie/${result.id}`,
                        title: result.title || result.name,
                        altTitles: [result.original_title || result.original_name, result.title || result.name],
                        img: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                        format: MediaFormat.MOVIE,
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

    override async proxyCheck(proxyURL: string): Promise<boolean | undefined> {
        try {
            const results: IProviderResult[] = [];

            const page = 1;
            const searchUrl = `/search/multi?api_key=${this.apiKey}&language=en-US&page=${page}&include_adult=false&query=${encodeURIComponent("Mushoku Tensei")}`;

            const data = (await (
                await this.request(this.api + searchUrl, {
                    proxy: proxyURL,
                })
            ).json()) as { results: ITMDBResponse[] };

            if (!data) return undefined;

            if (data.results.length > 0) {
                data.results.forEach((result) => {
                    if (result.media_type === "tv") {
                        results.push({
                            id: `/tv/${result.id}`,
                            title: result.title || result.name,
                            altTitles: [result.original_title || result.original_name, result.title || result.name],
                            img: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                            format: MediaFormat.UNKNOWN,
                            year: result.first_air_date ? new Date(result.first_air_date).getFullYear() : 0,
                            providerId: this.id,
                        });
                    } else if (result.media_type === "movie") {
                        results.push({
                            id: `/movie/${result.id}`,
                            title: result.title || result.name,
                            altTitles: [result.original_title || result.original_name, result.title || result.name],
                            img: `https://image.tmdb.org/t/p/w500${result.poster_path}`,
                            format: MediaFormat.MOVIE,
                            year: result.first_air_date ? new Date(result.first_air_date).getFullYear() : 0,
                            providerId: this.id,
                        });
                    }
                });
                return results.length > 0;
            } else {
                return false;
            }
        } catch {
            return false;
        }
    }
}

interface ITMDBResponse {
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
}
