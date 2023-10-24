import { get } from "../../database/impl/fetch/get";
import { update } from "../../database/impl/modify/update";
import { fillMediaInfo } from "../../lib/impl/mappings";
import { INFORMATION_PROVIDERS, animeProviders } from "../../mappings";
import { Anime, EpisodeData } from "../../types/types";
import colors from "colors";

/**
 * @description Fetches episodes and stores them in the database. Updates media data also via information providers.
 * @param id Media ID.
 * @returns Promise<EpisodeData[]>
 */
export const fetchEpisodes = async (id: string): Promise<EpisodeData[]> => {
    // Fetch media from database
    const media = await get(id);
    if (!media) return [];

    const mappings = media.mappings;
    const episodes: EpisodeData[] = [];

    // Fetch episodes from all mappings. Use Promise.all for improved speed.
    const promises: Promise<boolean>[] = mappings.map(async (mapping) => {
        const provider = animeProviders[mapping.providerId];
        if (!provider) return false;

        try {
            // Fetch episodes from provider
            const data = await provider.fetchEpisodes(String(mapping.id)).catch(() => []);
            if (data && data.length === 0) return true;

            data?.map((episode) => {
                if (!episode.updatedAt) episode.updatedAt = 0;
            });

            // Push episodes to the array
            if (data) {
                episodes.push({
                    providerId: mapping.providerId,
                    episodes: data,
                });
            }
            return true;
        } catch (e) {
            return false;
        }
    });

    await Promise.all(promises);

    // Update the latestEpisode for the media if it's not up to date.
    let updatedAt = (media as Anime).episodes.latest.updatedAt;
    let latestEpisode = (media as Anime).episodes.latest.latestEpisode;
    let latestTitle = (media as Anime).episodes.latest.latestTitle;

    for (const provider of episodes) {
        const latest = provider.episodes.reduce((prev, current) => (prev.number > current.number ? prev : current));
        if ((latest.number > latestEpisode || (latest.number === latestEpisode && latest.title !== latestTitle)) && !isNaN(Number(latest.updatedAt)) ? latest.updatedAt : 0 > updatedAt) {
            updatedAt = latest.updatedAt && !isNaN(Number(latest.updatedAt)) ? latest.updatedAt : 0;
            latestEpisode = Number(latest.number);
            latestTitle = String(latest.title);
        }
    }

    const totalEpisodes = !(media as Anime).totalEpisodes || (media as Anime).totalEpisodes! < latestEpisode ? latestEpisode : (media as Anime).totalEpisodes;

    // Update the media info via information providers
    for (let j = 0; j < INFORMATION_PROVIDERS.length; j++) {
        const provider = INFORMATION_PROVIDERS[j];

        // Fetch info from provider
        const info = await provider.info(media).catch((err) => {
            console.log(colors.red(`Error while fetching info for ${media.id} from ${provider.id}`));
            console.error(err);
            return null;
        });

        if (!info) {
            continue;
        }

        // Fill the media object with all necessary info
        fillMediaInfo(media, info, provider);
    }

    Object.assign(media, {
        currentEpisode: ((media as Anime).currentEpisode ?? 0) < latestEpisode ? latestEpisode : (media as Anime).currentEpisode,
        totalEpisodes,
        episodes: {
            latest: {
                latestEpisode,
                latestTitle,
                updatedAt,
            },
            data: episodes,
        },
    });

    await update(media);
    return episodes;
};
