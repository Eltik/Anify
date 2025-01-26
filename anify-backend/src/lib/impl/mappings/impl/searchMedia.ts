import type AnimeProvider from "../../../../mappings/impl/anime";
import type MangaProvider from "../../../../mappings/impl/manga";
import type MetaProvider from "../../../../mappings/impl/meta";
import type { IProviderResult } from "../../../../types";
import type { AnimeInfo, MangaInfo } from "../../../../types/impl/mappings/impl/mediaInfo";
import colors from "colors";

export async function searchMedia(baseData: AnimeInfo | MangaInfo, suitableProviders: (AnimeProvider | MangaProvider | MetaProvider)[]) {
    async function searchWith(title: string, provider: AnimeProvider | MangaProvider | MetaProvider): Promise<IProviderResult[]> {
        let timer: ReturnType<typeof setTimeout> | null = null;

        // Prepare the main fetch/search promise
        const fetchPromise = provider.search(title, baseData?.format, baseData?.year ?? 0);

        // Prepare a timeout promise (will reject after 15 seconds)
        const timeoutPromise = new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
                console.log(colors.red(`Timeout while fetching from provider ${colors.blue(provider.id)}. Skipping...`));
                reject(new Error("Timeout"));
            }, 15000);
        });

        try {
            // Race the fetch against the timeout
            const results = (await Promise.race([fetchPromise, timeoutPromise])) as IProviderResult[];
            if (!results) {
                console.log(colors.red(`No results fetching from provider ${colors.blue(provider.id)}. Skipping...`));
                return [];
            }
            return results;
        } catch (e) {
            console.error(e);
            console.log(colors.red(`Error fetching from provider ${colors.blue(provider.id)}. Skipping...`));
            return [];
        } finally {
            // Clear the timeout if it’s still pending
            if (timer) {
                clearTimeout(timer);
            }
        }
    }

    return Promise.all(
        suitableProviders.map(async (provider) => {
            // Build a list of synonyms (including the preferred title for this provider first)
            const preferredTitle = provider.preferredTitle || "english";
            const titlesToSearch = [baseData?.title?.[preferredTitle], baseData?.title?.english, baseData?.title?.romaji, baseData?.title?.native, ...(baseData?.synonyms ?? [])].filter(Boolean);

            // For each provider, test synonyms in series, short-circuit on the first successful result
            for (const title of titlesToSearch) {
                const results = await searchWith(title ?? "", provider);
                if (results.length > 0) {
                    console.log(colors.gray(`Found results for ${colors.blue(title ?? "")} on ${colors.blue(provider.id)}. Using alternative title...`));
                    return results;
                }
            }

            // If no synonyms returned results, return an empty array
            return [];
        }),
    );
}
