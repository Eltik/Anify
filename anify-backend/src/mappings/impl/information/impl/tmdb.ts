import InformationProvider from "..";
import { BASE_PROVIDERS } from "../../..";
import { type IChapter, type IEpisode, MediaFormat, MediaSeason, MediaType, ProviderType } from "../../../../types";
import type { IAnime } from "../../../../types/impl/database/impl/schema/anime";
import type { IManga } from "../../../../types/impl/database/impl/schema/manga";
import type { AnimeInfo, MangaInfo, MediaInfoKeys } from "../../../../types/impl/mappings/impl/mediaInfo";
import type { Response } from "node-fetch";

export default class TMDBInfo extends InformationProvider<IAnime | IManga, AnimeInfo | MangaInfo> {
    override id = "tmdb";
    override url = "https://themoviedb.org";

    private api = "https://api.themoviedb.org/3";
    private apiKey = "5201b54eb0968700e693a30576d7d4dc";

    public needsProxy: boolean = true;
    public useGoogleTranslate: boolean = false;

    override rateLimit = 0;
    override maxConcurrentRequests: number = -1;

    override formats: MediaFormat[] = [MediaFormat.TV, MediaFormat.MOVIE, MediaFormat.ONA, MediaFormat.SPECIAL, MediaFormat.TV_SHORT, MediaFormat.OVA];

    override get priorityArea(): MediaInfoKeys[] {
        return ["description"];
    }

    override get sharedArea(): MediaInfoKeys[] {
        return ["genres", "tags", "artwork"];
    }

    override async info(media: IAnime | IManga): Promise<AnimeInfo | MangaInfo | undefined> {
        const tmdbId = media.mappings.find((data) => {
            return data.providerId === "tmdb";
        })?.id;

        if (!tmdbId) return undefined;

        const data: Response | undefined = await this.request(`${this.api}${tmdbId}?api_key=${this.apiKey}`).catch(() => {
            return undefined;
        });

        if (!data) return undefined;

        if (data.ok) {
            try {
                const info = (await data.json()) as ITMDBResponse;
                if (!info) return undefined;

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
                    format: MediaFormat.UNKNOWN,
                    season: MediaSeason.UNKNOWN,
                    synonyms: [],
                    description: info.overview,
                    year: info.first_air_date ? new Date(info.first_air_date).getFullYear() : 0,
                    totalEpisodes: info.number_of_episodes,
                    genres: info.genres?.map((genre) => genre.name),
                    rating: info.vote_average,
                    popularity: info.popularity,
                    countryOfOrigin: info.origin_country[0] ?? null,
                    tags: [],
                    relations: [],
                    artwork: [
                        {
                            img: info.backdrop_path ? `https://image.tmdb.org/t/p/w500${info.backdrop_path}` : null,
                            providerId: this.id,
                            type: "banner",
                        },
                        {
                            img: info.poster_path ? `https://image.tmdb.org/t/p/w500${info.poster_path}` : null,
                            providerId: this.id,
                            type: "poster",
                        },
                    ],
                    characters: [],
                    totalChapters: null,
                    totalVolumes: null,
                    type: media.type,
                } as AnimeInfo;
            } catch {
                return undefined;
            }
        }

        return undefined;
    }

    override async fetchContentData(media: IAnime | IManga): Promise<IChapter[] | IEpisode[] | undefined> {
        const tmdbId = media.mappings.find((data) => {
            return data.providerId === "tmdb";
        })?.id;
        const anilistId = media.id;

        if (!tmdbId) return undefined;

        const baseProviders = await Promise.all(BASE_PROVIDERS.map((factory) => factory()));
        const anilistProvider = baseProviders.find((provider) => provider.id === "anilist");
        if (!anilistProvider) return undefined;

        // Uses Anilist provider & proxies to fetch data
        const anilistResponse = await anilistProvider.request(`https://graphql.anilist.co`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                query: `query {
                    Media(id: ${anilistId}) {
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
                        episodes
                        nextAiringEpisode {
                            episode
                        }
                    }
                }`,
            }),
        });

        const anilistMetadata = (await anilistResponse.json()) as { data: { Media: { episodes: number; startDate: { year: number; month: number; day: number }; endDate: { year: number; month: number; day: number }; nextAiringEpisode: { episode: number } } } };
        const anilistMedia = anilistMetadata?.data?.Media;

        const episodes: IEpisode[] = [];
        const episodesCount = (media as IAnime).totalEpisodes ?? anilistMedia?.episodes ?? anilistMedia?.nextAiringEpisode?.episode - 1;

        try {
            const data = (await (await this.request(`${this.api}${tmdbId}?api_key=${this.apiKey}`)).json()) as ITMDBResponse;
            const seasons = data.seasons;

            const isLongRunning = episodesCount > 50;
            const anilistStartDate = anilistMedia?.startDate ? new Date(anilistMedia.startDate.year, (anilistMedia.startDate.month || 1) - 1, anilistMedia.startDate.day || 1) : null;

            const anilistEndDate = anilistMedia?.endDate?.year ? new Date(anilistMedia.endDate.year, (anilistMedia.endDate.month || 1) - 1, anilistMedia.endDate.day || 1) : null;

            if (isLongRunning) {
                for (const season of seasons) {
                    if (season.episode_count === 0 || season.season_number === 0) continue;

                    const seasonData = (await (await this.request(`${this.api}${tmdbId}/season/${season.season_number}?api_key=${this.apiKey}`)).json()) as ITMDBSeasonData;

                    for (const episode of seasonData.episodes) {
                        const episodeDate = episode.air_date ? new Date(episode.air_date) : null;

                        if (anilistStartDate && episodeDate && episodeDate < anilistStartDate) continue;

                        if (anilistEndDate && episodeDate && episodeDate > anilistEndDate) continue;

                        episodes.push({
                            id: String(episode.id),
                            description: episode.overview,
                            hasDub: false,
                            img: episode.still_path ? `https://image.tmdb.org/t/p/w500${episode.still_path}` : null,
                            isFiller: false,
                            number: episodes.length + 1,
                            title: episode.name,
                            updatedAt: episodeDate?.getTime() || Date.now(),
                            rating: episode.vote_average,
                        });
                    }
                }
            } else {
                let bestScore = -1;
                let bestSeason = null;

                for (const season of seasons) {
                    if (season.episode_count === 0 || season.season_number === 0) continue;

                    let score = 0;
                    const seasonDate = season.air_date ? new Date(season.air_date) : null;

                    if (seasonDate && anilistStartDate) {
                        if (Math.abs(seasonDate.getTime() - anilistStartDate.getTime()) < 7776000000) {
                            score += 5;
                        }
                    }

                    if (episodesCount && season.episode_count === episodesCount) {
                        score += 4;
                    }

                    if (score > bestScore) {
                        bestScore = score;
                        bestSeason = season;
                    }
                }

                if (!bestSeason) {
                    bestSeason = seasons.find((s) => s.episode_count > 0 && s.season_number > 0);
                }

                if (!bestSeason) return undefined;

                const seasonData = (await (await this.request(`${this.api}${tmdbId}/season/${bestSeason.season_number}?api_key=${this.apiKey}`)).json()) as ITMDBSeasonData;

                for (const episode of seasonData.episodes) {
                    const episodeDate = episode.air_date ? new Date(episode.air_date) : null;

                    if (anilistStartDate && episodeDate && episodeDate.getTime() - anilistStartDate.getTime() < -7 * 24 * 60 * 60 * 1000) {
                        continue;
                    }

                    if (anilistEndDate && episodeDate && episodeDate.getTime() - anilistEndDate.getTime() > 7 * 24 * 60 * 60 * 1000) {
                        continue;
                    }

                    episodes.push({
                        id: String(episode.id),
                        description: episode.overview,
                        hasDub: false,
                        img: episode.still_path ? `https://image.tmdb.org/t/p/w500${episode.still_path}` : null,
                        isFiller: false,
                        number: episodes.length + 1,
                        title: episode.name,
                        updatedAt: episodeDate?.getTime() || Date.now(),
                        rating: episode.vote_average,
                    });
                }

                if (episodes.length < episodesCount) {
                    for (const nextSeason of seasons) {
                        if (nextSeason.season_number <= bestSeason.season_number || nextSeason.episode_count === 0) continue;

                        const nextSeasonData = (await (await this.request(`${this.api}${tmdbId}/season/${nextSeason.season_number}?api_key=${this.apiKey}`)).json()) as ITMDBSeasonData;
                        for (const episode of nextSeasonData.episodes) {
                            if (episodes.length >= episodesCount) break;

                            const episodeDate = episode.air_date ? new Date(episode.air_date) : null;
                            if (anilistEndDate && episodeDate && episodeDate > anilistEndDate) continue;

                            episodes.push({
                                id: String(episode.id),
                                description: episode.overview,
                                hasDub: false,
                                img: episode.still_path ? `https://image.tmdb.org/t/p/w500${episode.still_path}` : null,
                                isFiller: false,
                                number: episodes.length + 1,
                                title: episode.name,
                                updatedAt: episodeDate?.getTime() || Date.now(),
                                rating: episode.vote_average,
                            });
                        }

                        if (episodes.length >= episodesCount) break;
                    }
                }
            }

            return episodes;
        } catch {
            return undefined;
        }
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
                        id: "/tv/94664",
                        providerId: "tmdb",
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

            const tmdbId = media.mappings.find((data) => {
                return data.providerId === "tmdb";
            })?.id;

            if (!tmdbId) return undefined;

            const data: Response | undefined = await this.request(`${this.api}${tmdbId}?api_key=${this.apiKey}`, {
                proxy: proxyURL,
            }).catch(() => {
                return undefined;
            });

            if (!data) return false;

            if (data.ok) {
                try {
                    const info = await data.json();
                    if (!info) return false;

                    return true;
                } catch {
                    return false;
                }
            }

            return false;
        } catch {
            return false;
        }
    }
}

interface ITMDBResponse {
    adult: boolean;
    backdrop_path: string | null;
    created_by: {
        id: number;
        credit_id: string;
        name: string;
        gender: number;
        profile_path: string | null;
    }[];
    episode_run_time: number[];
    first_air_date: string;
    genres: {
        id: number;
        name: string;
    }[];
    homepage: string;
    id: number;
    in_production: boolean;
    languages: string[];
    last_air_date: string;
    last_episode_to_air: {
        id: number;
        name: string;
        overview: string;
        vote_average: number;
        vote_count: number;
        air_date: string;
        episode_number: number;
        episode_type: string;
        production_code: string;
        runtime: number;
        season_number: number;
        show_id: number;
        still_path: string | null;
    } | null;
    name: string;
    next_episode_to_air: null;
    networks: {
        id: number;
        logo_path: string | null;
        name: string;
        origin_country: string;
    }[];
    number_of_episodes: number;
    number_of_seasons: number;
    origin_country: string[];
    original_language: string;
    original_name: string;
    overview: string;
    popularity: number;
    poster_path: string | null;
    production_companies: {
        id: number;
        logo_path: string | null;
        name: string;
        origin_country: string;
    }[];
    production_countries: {
        iso_3166_1: string;
        name: string;
    }[];
    seasons: {
        air_date: string | null;
        episode_count: number;
        id: number;
        name: string;
        overview: string;
        poster_path: string | null;
        season_number: number;
        vote_average: number;
    }[];
    spoken_languages: {
        english_name: string;
        iso_639_1: string;
        name: string;
    }[];
    status: string;
    tagline: string;
    type: string;
    vote_average: number;
    vote_count: number;
}

interface ITMDBSeasonData {
    _id: string;
    air_date: string;
    episodes: {
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
        still_path: string | null;
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
    }[];
}
