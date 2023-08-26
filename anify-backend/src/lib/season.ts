import emitter, { Events } from "../helper/event";
import { Format, Type } from "../mapping";
import AniList from "../mapping/impl/information/anilist";

export const loadSeasonal = async (data: { type: Type; formats: Format[] }) => {
    const result = await new AniList().fetchSeasonal(data.type, data.formats);

    await emitter.emitAsync(Events.COMPLETED_SEASONAL_LOAD, result);

    return result;
};
