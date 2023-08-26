import Database from "../database";
import emitter, { Events } from "../helper/event";
import { Format, Type } from "../mapping";
import AniList from "../mapping/impl/information/anilist";

export const loadSearch = async (data: { query: string; type: Type; formats: Format[] }) => {
    // First check if exists in database
    const existing = await Database.search(data.query, data.type, data.formats, 1, 15);
    if (existing.length > 0) {
        await emitter.emitAsync(Events.COMPLETED_SEARCH_LOAD, existing);
        return existing;
    }

    const result = await new AniList().search(data.query, data.type, data.formats, 0, 10);

    await emitter.emitAsync(Events.COMPLETED_SEARCH_LOAD, result);

    return result;
};
