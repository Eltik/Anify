import { Format, Result } from "../..";
import MetaProvider from ".";

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
            data.results.forEach((result) => {
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

    public async getEpisodeCovers(id: string, seasonNumber: number): Promise<{ episode: number; img: string }[] | undefined> {
        const seasonUrl = `${id}/season/${seasonNumber}?api_key=${this.apiKey}`;
        const data = await (await this.request(this.tmdbApiUrl + seasonUrl)).json();
        const episodes = data.episodes;
        const episodeCovers: { episode: number; img: string }[] = [];
        if (!episodes) {
            return [];
        }
        episodes.forEach((episode) => {
            if (episode.still_path != null) {
                episodeCovers.push({
                    episode: episode.episode_number,
                    img: `https://image.tmdb.org/t/p/original${episode.still_path}`,
                });
            }
        });
        return episodeCovers;
    }
}
