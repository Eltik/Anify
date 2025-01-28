import colors from "colors";
import type { IAnime } from "../../../../types/impl/database/impl/schema/anime";
import type { IEpisodeData } from "../../../../types/impl/database/impl/mappings";
import { ANIME_PROVIDERS, INFORMATION_PROVIDERS } from "../../../../mappings";
import { fillMediaInfo } from "../../mappings/impl/createMedia";
import { emitter } from "../../../../events";
import { Events } from "../../../../types/impl/events";

const loadEpisodes = async (media: IAnime): Promise<IEpisodeData[]> => {
    const episodes: IEpisodeData[] = [];
    const mappings = media.mappings ?? [];

    // If the anime is finished and we already have episode data, return it
    if (media.status === "FINISHED" && media.episodes?.data?.length > 0) {
        return media.episodes.data;
    }

    // 1. Fetch episodes from providers in parallel.
    await Promise.all(
        mappings.map(async (mapping) => {
            const animeProviders = await Promise.all(ANIME_PROVIDERS.map((factory) => factory()));

            const provider = animeProviders.find((p) => p.id === mapping.providerId);
            if (!provider) {
                return;
            }

            try {
                const data = await provider.fetchEpisodes(String(mapping.id)).catch(() => []);
                if (!data || data.length === 0) {
                    return;
                }

                // Ensure each episode has an updatedAt field.
                for (const ep of data) {
                    if (!ep.updatedAt) {
                        ep.updatedAt = 0;
                    }
                }

                // Add to our episodes array.
                episodes.push({
                    providerId: mapping.providerId,
                    episodes: data,
                });
            } catch {
                // We silently fail here (optional: add debug logs).
            }
        }),
    );

    // 2. Find the latest episode across all providers.
    let { latestEpisode = 0, latestTitle = "", updatedAt = 0 } = media.episodes?.latest ?? {};

    for (const { episodes: providerEpisodes } of episodes) {
        const latest = providerEpisodes.reduce((prev, current) => (prev.number > current.number ? prev : current));

        const candidateEpisodeNumber = Number(latest.number);
        const candidateUpdatedAt = !Number.isNaN(Number(latest.updatedAt)) ? Number(latest.updatedAt) : 0;

        // Check if the new episode is later or has a more recent updatedAt
        const hasNewerEpisode = candidateEpisodeNumber > latestEpisode || (candidateEpisodeNumber === latestEpisode && latest.title !== latestTitle);
        const isUpdatedMoreRecently = candidateUpdatedAt > updatedAt;

        if (hasNewerEpisode && isUpdatedMoreRecently) {
            latestEpisode = candidateEpisodeNumber;
            latestTitle = String(latest.title);
            updatedAt = candidateUpdatedAt;
        }
    }

    // If the totalEpisodes is not set or is behind the latest episode, update it.
    const totalEpisodes = !media.totalEpisodes || (media.totalEpisodes as number) < latestEpisode ? latestEpisode : media.totalEpisodes;

    // 3. Update media info from all information providers in parallel (instead of sequential).
    const infoProviders = await Promise.all(INFORMATION_PROVIDERS.map((factory) => factory()));
    const providerPromises = infoProviders.map(async (provider) => {
        try {
            const info = await provider.info(media);
            if (info) {
                fillMediaInfo(media, info, provider);
            }
        } catch (err) {
            console.log(colors.red(`Error while fetching info for ${media.id} from ${provider.id}`));
            console.error(err);
        }
    });

    // Run them all simultaneously, ignoring rejections from any single provider.
    await Promise.allSettled(providerPromises);

    // 4. Send the updated data to the database.
    emitter.emit(Events.COMPLETED_EPISODES_LOAD, {
        id: media.id,
        newData: {
            currentEpisode: media.currentEpisode && media.currentEpisode >= latestEpisode ? media.currentEpisode : latestEpisode,
            totalEpisodes,
            episodes: {
                latest: {
                    latestEpisode,
                    latestTitle,
                    updatedAt,
                },
                data: episodes,
            },
        },
    });

    return episodes;
};

export default loadEpisodes;
