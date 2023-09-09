import { animeProviders } from "../../mappings";
import { StreamingServers, SubType } from "../../types/enums";
import { Source } from "../../types/types";

export const fetchSources = async (providerId: string, watchId: string, subType: SubType, server: StreamingServers): Promise<Source | null> => {
    const provider = animeProviders[providerId];
    if (!provider) return null;

    if (provider.subTypes && !provider.subTypes.includes(subType)) return null;

    try {
        const data = await provider.fetchSources(watchId, subType, server).catch((err) => {
            return null;
        });

        if (!data) return null;
        return data;
    } catch (e) {
        return null;
    }
};
