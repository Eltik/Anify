import { ANIME_PROVIDERS, MANGA_PROVIDERS, META_PROVIDERS } from "../../../../mappings";
import type AnimeProvider from "../../../../mappings/impl/anime";
import type MangaProvider from "../../../../mappings/impl/manga";
import type MetaProvider from "../../../../mappings/impl/meta";
import { type IProviderResult, type MediaFormat, MediaType } from "../../../../types";
import type { IMappedResult } from "../../../../types/impl/lib/impl/mappings";
import type { IMedia } from "../../../../types/impl/mappings";
import type { AnimeInfo, MangaInfo } from "../../../../types/impl/mappings/impl/mediaInfo";
import { findBestMatch } from "./helper/findBestMatch";
import { searchMedia } from "./searchMedia";
import colors from "colors";
import { slugify } from "./helper/slugify";
import { createMedia } from "./createMedia";

export const map = async (type: MediaType, formats: MediaFormat[], baseData: AnimeInfo | MangaInfo | undefined): Promise<IMedia[]> => {
    const providerFactories = type === MediaType.ANIME ? [...ANIME_PROVIDERS, ...META_PROVIDERS] : [...MANGA_PROVIDERS, ...META_PROVIDERS];
    const allProviders = await Promise.all(providerFactories.map((factory) => factory()));

    const suitableProviders = allProviders
        .filter((provider) => {
            if (formats && provider.formats) {
                return formats.some((format) => provider.formats.includes(format));
            }
            return true;
        })
        .reduce((acc: (AnimeProvider | MangaProvider | MetaProvider)[], currentProvider) => {
            const existingProvider = acc.find((provider) => provider.id === currentProvider.id);
            if (!existingProvider) {
                acc.push(currentProvider);
            }
            return acc;
        }, []);

    console.log(colors.gray("Fetching from providers for ") + colors.blue(baseData?.id ?? "") + colors.gray("..."));
    const resultsArray = await searchMedia(baseData as AnimeInfo | MangaInfo, suitableProviders);
    console.log(colors.gray("Finished fetching from providers for ") + colors.blue(baseData?.id ?? "") + colors.gray("."));

    const mappings: IMappedResult[] = [];

    for (let i = 0; i < resultsArray.length; i++) {
        const providerData = resultsArray[i];

        const providerTitles = providerData?.map((m: IProviderResult) => {
            const titles = [m.title, ...(m.altTitles ?? [])];
            return titles.filter((title) => typeof title === "string");
        });

        const title = baseData?.title?.english ?? baseData?.title?.romaji ?? baseData?.title?.native ?? "";

        // If there are no results, skip
        if (!providerTitles || providerTitles?.length === 0) {
            console.log(colors.gray("No results found for ") + colors.blue(title) + colors.gray(" on ") + colors.blue(suitableProviders[i].id) + colors.gray("."));
            continue;
        }

        const match = findBestMatch(baseData, providerData);
        if (match) {
            if (match.similarity < 0.7) {
                console.log(
                    colors.gray("Unable to match ") +
                        colors.blue(title) +
                        colors.gray(" for ") +
                        colors.blue(suitableProviders[i].id) +
                        colors.gray(".") +
                        colors.gray(" Best match rating: ") +
                        colors.blue(`${match.similarity}`) +
                        colors.gray(". ID: ") +
                        colors.blue(match.match.id) +
                        colors.gray(". Title: ") +
                        colors.blue(match.match.title) +
                        colors.gray("."),
                );
                continue;
            }

            mappings.push({
                id: baseData?.id ?? "",
                slug: slugify(title),
                data: match.match,
                similarity: match.similarity,
            });
        }
    }

    const result = await createMedia(mappings, type);
    return result;
};
