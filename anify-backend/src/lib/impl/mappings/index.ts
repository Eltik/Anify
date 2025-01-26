import { emitter } from "../../../events";
import { type MediaFormat, MediaStatus, type MediaType } from "../../../types";
import type { IMedia } from "../../../types/impl/mappings";
import colors from "colors";
import { MediaRepository } from "../../../database/impl/wrapper/impl/media";
import { db } from "../../../database";
import { Events } from "../../../types/impl/events";
import { BASE_PROVIDERS } from "../../../mappings";
import { map } from "./impl/map";

/**
 * @description Maps media to base providers and fetches info from a variety of websites.
 * @param data The data to load the mapping for.
 * @returns Promise<Anime[] | Manga[]>
 */
const loadMapping = async (data: { id: string; type: MediaType; formats: MediaFormat[] }): Promise<IMedia[]> => {
    try {
        // First check if exists in database
        const existing = await MediaRepository.getById(db, data.type, data.id);

        if (existing) {
            // If it does, emit the event and return
            await emitter.emitAsync(Events.COMPLETED_MAPPING_LOAD, [existing]);
            return [existing] as IMedia[];
        }
    } catch (e) {
        console.error(e);
        console.log(colors.red("Error while fetching from database."));
    }

    console.log(colors.gray("Loading mapping for ") + colors.blue(data.id) + colors.gray("..."));

    const promiseArray = BASE_PROVIDERS.map(async (prov) => {
        const provider = await prov();

        // Use only providers that match the desired format
        if (provider.formats?.includes(data.formats[0])) {
            return await provider.getMedia(data.id);
        }
            return null;
    });

    const resolvedResults = await Promise.all(promiseArray);

    // Filter out null results
    const baseData = resolvedResults.find((data) => data !== null);

    // Usually if there is no title, the media doesn't exist.
    if (!baseData || ((!baseData.title?.english || baseData.title.english?.length === 0) && (!baseData.title?.romaji || baseData.title.romaji?.length === 0) && (!baseData.title?.native || baseData.title.native?.length === 0))) {
        console.log(colors.red(`Media not found. ${baseData?.title?.english} ${baseData?.title?.romaji} ${baseData?.title?.native}`));

        await emitter.emitAsync(Events.COMPLETED_MAPPING_LOAD, []);
        return [];
    }

    if (baseData.status === MediaStatus.NOT_YET_RELEASED) {
        console.log(colors.red("Media is not yet released. Skipping..."));
        return [];
    }

    // Map the data.
    const result = await map(baseData.type, [baseData.format], baseData);

    // Only return if the ID matches the one we're looking for
    // If it isn't, we don't want to return.
    for (let i = 0; i < result.length; i++) {
        if (String(result[i].id) === String(data.id)) {
            console.log(colors.gray("Found mapping for ") + colors.blue(data.id) + colors.gray(".") + colors.gray(" Saving..."));
            await emitter.emitAsync(Events.COMPLETED_MAPPING_LOAD, [result[i]]);

            return [result[i]] as IMedia[];
        }
    }

    await emitter.emitAsync(Events.COMPLETED_MAPPING_LOAD, []);
    return [];
};

export default loadMapping;
