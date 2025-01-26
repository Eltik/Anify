import type { IMedia } from "../../../../types/impl/mappings";
import { INFORMATION_PROVIDERS } from "../../../../mappings";
import type { IContentMetadata } from "../../../../types/impl/lib/impl/content";

const loadMetadata = async (media: IMedia): Promise<IContentMetadata[]> => {
    const mappings = media.mappings ?? [];

    // Use Promise.all for concurrency and build up ContentMetadata objects
    const results = await Promise.all(
        mappings.map(async (mapping) => {
            const infoProviders = await Promise.all(INFORMATION_PROVIDERS.map((factory) => factory()));
            const provider = infoProviders.find((p) => p.id === mapping.providerId);
            if (!provider) return null;

            try {
                const data = await provider.fetchContentData(media);
                if (!data?.length) return null; // Skip if no data returned

                // Fill in missing updatedAt fields
                for (const chapter of data) {
                    if (!chapter.updatedAt) {
                        chapter.updatedAt = 0;
                    }
                }
                // Return a structured ContentMetadata object
                return {
                    providerId: mapping.providerId,
                    data,
                } as IContentMetadata;
            } catch {
                // Gracefully handle any provider failures
                return null;
            }
        }),
    );

    // Filter out null entries and return
    return results.filter(Boolean) as IContentMetadata[];
};

export default loadMetadata;
