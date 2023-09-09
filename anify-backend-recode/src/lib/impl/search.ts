import emitter, { Events } from "..";
import { search } from "../../database/impl/search/search";
import { BASE_PROVIDERS, baseProviders } from "../../mappings";
import { Format, Type } from "../../types/enums";

export const loadSearch = async (data: { query: string; type: Type; formats: Format[] }) => {
    // First check if exists in database
    const existing = await search(data.query, data.type, data.formats, 1, 15);
    if (existing.length > 0) {
        await emitter.emitAsync(Events.COMPLETED_SEARCH_LOAD, existing);
        return existing;
    }

    const result = await BASE_PROVIDERS.map((provider) => {
        if (provider.formats?.includes(data.formats[0])) {
            return provider.search(data.query, data.type, data.formats, 0, 10);
        } else {
            return null;
        }
    }).filter((x) => x !== null)[0];

    await emitter.emitAsync(Events.COMPLETED_SEARCH_LOAD, result);
    return result;
};
