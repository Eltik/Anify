import AniList from "@/src/mapping/impl/information/anilist";
import { animeProviders, Anime, Type } from "../../../mapping";
import { Episode } from "../../../mapping/impl/anime";
import Database from "@/src/database";

export const fetchEpisodes = async (id: string): Promise<EpisodeData[]> => {
    const media = await Database.info(id);
    if (!media) return [];

    const mappings = media.mappings;

    const episodes: EpisodeData[] = [];

    const promises: Promise<boolean>[] = mappings.map(async (mapping) => {
        const provider = animeProviders[mapping.providerId];

        if (!provider) return false;

        try {
            const data = await provider.fetchEpisodes(String(mapping.id)).catch(() => []);
            if (data && data.length === 0) return true;

            data?.map((episode) => {
                if (!episode.updatedAt) episode.updatedAt = 0;
            });

            if (data) {
                episodes.push({
                    providerId: mapping.providerId,
                    episodes: data,
                });
            }
            return true;
        } catch (e) {
            //console.log(colors.red(`Failed to fetch episodes for ${mapping.providerId} ${mapping.id}`))
            return false;
        }
    });

    await Promise.all(promises);

    // Check if chapters length are different than before
    let updatedAt = (media as Anime).episodes.latest.updatedAt;
    let latestEpisode = (media as Anime).episodes.latest.latestEpisode;
    let latestTitle = (media as Anime).episodes.latest.latestTitle;

    if (episodes.length != 0) {
        if ((media as Anime).episodes.data.length != 0) {
            for (const provider of (media as Anime).episodes.data) {
                const providerEpisodes = provider.episodes;
                const providerId = provider.providerId;
                for (const provider of episodes) {
                    if (provider.providerId === providerId) {
                        //if (provider.episodes.length > providerEpisodes.length) {
                        // Find the latest chapter
                        const latest = provider.episodes.reduce((prev, current) => (prev.number > current.number ? prev : current));
                        if ((latest.updatedAt ?? 0) > updatedAt && (latest.number > latestEpisode || (latest.number === latestEpisode && latest.title !== latestTitle)) && latest.updatedAt && !isNaN(Number(latest.updatedAt)) ? latest.updatedAt : 0 > updatedAt) {
                            updatedAt = latest.updatedAt && !isNaN(Number(latest.updatedAt)) ? latest.updatedAt : 0;
                            latestEpisode = Number(latest.number);
                            latestTitle = String(latest.title);
                        }
                        //}
                    }
                }
            }
        } else {
            updatedAt = 0;
            latestEpisode = 0;
            latestTitle = "";

            for (const provider of episodes) {
                const latest = provider.episodes.reduce((prev, current) => (prev.number > current.number ? prev : current));
                if ((latest.updatedAt ?? 0) > updatedAt && latest.updatedAt && !isNaN(Number(latest.updatedAt)) ? latest.updatedAt : 0 > updatedAt) {
                    updatedAt = latest.updatedAt && !isNaN(Number(latest.updatedAt)) ? latest.updatedAt : 0;
                    latestEpisode = Number(latest.number);
                    latestTitle = String(latest.title);
                }
            }
        }
    }

    if (latestEpisode === 0) (latestEpisode = (media as Anime).episodes.latest.latestEpisode), (latestTitle = (media as Anime).episodes.latest.latestTitle), (updatedAt = updatedAt === 0 && (media as Anime).episodes.latest.updatedAt !== 0 ? (media as Anime).episodes.latest.updatedAt : updatedAt);

    const aniList = new AniList();
    const anilistMedia = await aniList.getMedia(id);

    // Update basic information
    await Database.update(id, Type.ANIME, {
        status: anilistMedia?.status ?? media.status,
        rating: {
            anilist: anilistMedia?.rating ?? media.rating.anilist,
            kitsu: media.rating.kitsu,
            mal: media.rating.mal,
        },
        popularity: {
            anilist: anilistMedia?.popularity ?? media.popularity.anilist,
            kitsu: media.popularity.kitsu,
            mal: media.popularity.mal,
        },
        episodes: {
            latest: {
                updatedAt,
                latestEpisode,
                latestTitle,
            },
            data: episodes,
        },
        totalEpisodes: !(media as Anime).totalEpisodes || (media as Anime).totalEpisodes! < latestEpisode ? latestEpisode : (media as Anime).totalEpisodes,
    });

    return episodes;
};

export type EpisodeData = {
    providerId: string;
    episodes: Episode[];
};
