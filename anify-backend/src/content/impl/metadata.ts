import { get } from "../../database/impl/modify/get";
import { infoProviders } from "../../mappings";
import { ContentMetadata } from "../../types/types";

export const fetchMetaData = async (id: string): Promise<ContentMetadata[]> => {
    const media = await get(id);
    if (!media) return [];

    const metadata: ContentMetadata[] = [];

    const mappings = media.mappings;

    const promises: Promise<boolean>[] = mappings.map(async (mapping) => {
        const provider = infoProviders[mapping.providerId];

        if (!provider) return false;

        try {
            const data = await provider.fetchContentData(media).catch(() => []);
            if (data && data.length === 0) return true;

            data?.map((chapter) => {
                if (!chapter.updatedAt) chapter.updatedAt = 0;
            });

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
