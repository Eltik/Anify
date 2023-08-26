import { animeProviders } from "../../../mapping";
import { Source, StreamingServers, SubType } from "../../../mapping/impl/anime";

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
