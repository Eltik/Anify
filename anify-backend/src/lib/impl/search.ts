import emitter, { Events } from "..";
import { search } from "../../database/impl/search/search";
import { searchAdvanced } from "../../database/impl/search/searchAdvanced";
import { BASE_PROVIDERS } from "../../mappings";
import { Format, Genres, Type } from "../../types/enums";

export const loadSearch = async (data: { query: string; type: Type; formats: Format[]; genres?: Genres[]; genresExcluded?: Genres[]; year?: number; tags?: string[]; tagsExcluded?: string[] }) => {
    if ((Array.isArray(data.genres) && data.genres.length > 0) || (Array.isArray(data.genresExcluded) && data.genresExcluded.length > 0) || data.year || (Array.isArray(data.tags) && data.tags.length > 0) || (Array.isArray(data.tagsExcluded) && data.tagsExcluded.length > 0)) {
        // First check if exists in database
        const existing = await searchAdvanced(data.query, data.type, data.formats, 1, 15, data.genres, data.genresExcluded, data.year, data.tags, data.tagsExcluded);
        if (existing.length > 0) {
            await emitter.emitAsync(Events.COMPLETED_SEARCH_LOAD, existing);
            return existing;
        }

        const result = await BASE_PROVIDERS.map((provider) => {
            if (provider.formats?.includes(data.formats[0])) {
                return provider.searchAdvanced(data.query, data.type, data.formats, 1, 15, data.genres, data.genresExcluded, data.year, data.tags, data.tagsExcluded);
            } else {
                return null;
            }
        }).filter((x) => x !== null)[0];

        await emitter.emitAsync(Events.COMPLETED_SEARCH_LOAD, result);
        return result;
    } else {
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
    }
};
