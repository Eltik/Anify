import colors from "colors";

import { ANIME_PROVIDERS, MANGA_PROVIDERS } from "../../mappings";

export const testContent = async () => {
    for (const provider of ANIME_PROVIDERS) {
        try {
            const results = await provider.search("naruto");
            console.log(colors.green(`Search on ${provider.id} returned ${results?.length ?? 0} results`) + "\n");
        } catch (e) {
            throw new Error(`Failed to search on ${provider.id}: ${e}`);
        }
    }

    for (const provider of MANGA_PROVIDERS) {
        try {
            const results = await provider.search("solo leveling");
            console.log(colors.green(`Search on ${provider.id} returned ${results?.length ?? 0} results`) + "\n");
        } catch (e) {
            throw new Error(`Failed to search on ${provider.id}: ${e}`);
        }
    }
};
