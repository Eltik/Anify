import { get } from "../../database/impl/fetch/get";
import { infoProviders } from "../../mappings";
import { ContentMetadata } from "../../types/types";

/**
 * @description Fetches content metadata such as episode covers, episode/chapter descriptions, etc.
 * @param id Media ID
 * @returns Promise<ContentMetadata[]>
 */
export const fetchMetaData = async (id: string): Promise<ContentMetadata[]> => {
    // Fetch media from database
    const media = await get(id);
    if (!media) return [];

    const mappings = media.mappings;
    const metadata: ContentMetadata[] = [];

    // Fetch content metadata from all mappings. Use Promise.all for improved speed.
    const promises: Promise<boolean>[] = mappings.map(async (mapping) => {
        const provider = infoProviders[mapping.providerId];
        if (!provider) return false;

        try {
            // Fetch content metadata from provider
            const data = await provider.fetchContentData(media).catch(() => []);
            if (data && data.length === 0) return true;

            data?.map((chapter) => {
                if (!chapter.updatedAt) chapter.updatedAt = 0;
            });

            // Push content metadata to the array
            if (data) {
                metadata.push({
                    providerId: mapping.providerId,
                    data,
                });
            }
            return true;
        } catch (e) {
            return false;
        }
    });

    await Promise.all(promises);
    return metadata;
};
