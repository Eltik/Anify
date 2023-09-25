import { mangaProviders } from "../../mappings";
import { Page } from "../../types/types";

export const fetchPages = async (providerId: string, readId: string): Promise<string | Page[] | null> => {
    const provider = mangaProviders[providerId];

    if (!provider) return null;

    try {
        const data = await provider.fetchPages(readId).catch(() => {
            return null;
        });
        if (!data) return null;
        return data;
    } catch (e) {
        return null;
    }
};
