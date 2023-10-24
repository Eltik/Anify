import { mangaProviders } from "../../mappings";
import { Page } from "../../types/types";

/**
 * @description Fetches pages from the provider.
 * @param providerId Manga provider ID
 * @param readId Read ID from chapters array
 * @returns Promise<string | Page[] | null>
 */
export const fetchPages = async (providerId: string, readId: string): Promise<string | Page[] | null> => {
    const provider = mangaProviders[providerId];
    if (!provider) return null;

    try {
        // Fetch pages from provider
        const data = await provider.fetchPages(readId).catch(() => {
            return null;
        });
        if (!data) return null;
        return data;
    } catch (e) {
        return null;
    }
};
