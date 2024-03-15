import { animeProviders } from "../../mappings";
import { StreamingServers, SubType } from "../../types/enums";
import { Source } from "../../types/types";

/**
 * @description Fetches source links (eg. m3u8 urls) from the provider.
 * @param providerId Anime provider ID
 * @param watchId Watch ID from episodes array
 * @param subType Sub type
 * @param server Streaming server
 * @returns Promise<Source | null>
 */
export const fetchSources = async (providerId: string, watchId: string, subType: SubType, server: StreamingServers): Promise<Source | null> => {
    const provider = animeProviders[providerId];
    if (!provider) return null;

    // Check if the provider supports the sub type
    if (provider.subTypes && !provider.subTypes.includes(subType)) return null;

    try {
        // Fetch sources from provider
        const data = await provider.fetchSources(watchId, subType, server).catch(() => {
            return null;
        });

        if (!data) return null;
        return data;
    } catch (e) {
        return null;
    }
};
