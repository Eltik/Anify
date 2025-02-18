import { MediaType, type MediaFormat } from "../../../../types";
import type { IMedia } from "../../../../types/impl/mappings";
import type { AnimeInfo, MangaInfo } from "../../../../types/impl/mappings/impl/mediaInfo";
import colors from "colors";
import { MappingQueue } from "./mappingQueue";

export const map = async (type: MediaType, formats: MediaFormat[], baseData: AnimeInfo | MangaInfo | undefined): Promise<IMedia[]> => {
    if (!baseData) {
        console.log(colors.red("No base data provided for mapping"));
        return [];
    }

    const mappingQueue = MappingQueue.getInstance();
    return mappingQueue.addToQueue(baseData.id, type, formats, baseData);
};
