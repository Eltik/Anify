/**
 * @description Fetches pages from the provider.
 * @param providerId Manga provider ID
 * @param readId Read ID from chapters array
 * @returns Promise<string | Page[] | null>
 */

import { MANGA_PROVIDERS } from "../../../../mappings";
import type { IPage } from "../../../../types/impl/mappings/impl/manga";

const loadPages = async (providerId: string, readId: string): Promise<IPage[] | string | null> => {
    const mangaProviders = await Promise.all(MANGA_PROVIDERS.map((factory) => factory()));
    const provider = mangaProviders.find((p) => p.id === providerId);
    if (!provider) return null;

    try {
        // Fetch sources from provider
        const data = await provider.fetchPages(readId).catch(() => {
            return null;
        });

        if (!data) return null;
        return data;
    } catch {
        return null;
    }
};

export default loadPages;
