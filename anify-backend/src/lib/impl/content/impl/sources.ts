/**
 * @description Fetches source links (eg. m3u8 urls) from the provider.
 * @param providerId Anime provider ID
 * @param watchId Watch ID from episodes array
 * @param subType Sub type
 * @param server Streaming server
 * @returns Promise<Source | null>
 */

import { ANIME_PROVIDERS } from "../../../../mappings";
import type { ISource, StreamingServers, SubType } from "../../../../types/impl/mappings/impl/anime";

const loadSources = async (providerId: string, watchId: string, subType: SubType, server: StreamingServers): Promise<ISource | null> => {
    const animeProviders = await Promise.all(ANIME_PROVIDERS.map((factory) => factory()));
    const provider = animeProviders.find((p) => p.id === providerId);
    if (!provider) return null;

    if (provider.subTypes && !provider.subTypes.includes(subType)) return null;

    try {
        // Fetch sources from provider
        const data = await provider.fetchSources(watchId, subType, server).catch(() => {
            return null;
        });

        if (!data) return null;
        return data;
    } catch {
        return null;
    }
};

export default loadSources;
