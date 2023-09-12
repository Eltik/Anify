import emitter, { Events } from "..";
import { BASE_PROVIDERS } from "../../mappings";
import { Format, Type } from "../../types/enums";

export const loadSeasonal = async (data: { type: Type; formats: Format[] }) => {
    const result = await BASE_PROVIDERS.map((provider) => {
        if (provider.formats?.includes(data.formats[0])) {
            return provider.fetchSeasonal(data.type, data.formats);
        } else {
            return null;
        }
    }).filter((x) => x !== null)[0];

    await emitter.emitAsync(Events.COMPLETED_SEASONAL_LOAD, result);

    return result;
};
