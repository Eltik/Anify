import { get } from "../../database/impl/fetch/get";
import { update } from "../../database/impl/modify/update";
import { fillMediaInfo } from "../../lib/impl/mappings";
import { INFORMATION_PROVIDERS, mangaProviders } from "../../mappings";
import { ChapterData, Manga } from "../../types/types";
import colors from "colors";

/**
 * @description Fetches chapters and stores them in the database. Updates media data also via information providers.
 * @param id Media ID.
 * @returns Promise<ChapterData[]>
 */
export const fetchChapters = async (id: string): Promise<ChapterData[]> => {
    // Fetch media from database
    const media = await get(id);
    if (!media) return [];

    const mappings = media.mappings;
    const storedChapters = (media as Manga).chapters.data;
    const chapters: ChapterData[] = [];

    // Fetch chapters from all mappings. Use Promise.all for improved speed.
    const promises: Promise<boolean>[] = mappings.map(async (mapping) => {
        const provider = mangaProviders[mapping.providerId];
        if (!provider) return false;

        try {
            // Fetch chapters from provider
            const data = await provider.fetchChapters(String(mapping.id)).catch(() => []);
            if (data && data.length === 0) return true;

            data?.map((chapter) => {
                // Find the stored chapter in the database.
                const storedChapter = storedChapters.map((provider) => {
                    if (provider.providerId === mapping.providerId) {
                        return provider.chapters.find((c) => c.id === chapter.id);
                    }
                })[0];

                if (!chapter.updatedAt) chapter.updatedAt = 0;

                // Add the mixdrop link to the provider chapter
                // since mixdrop links are stored via the database
                // and not the provider. Eg. the provider won't have
                // the mixdrop link.
                if (storedChapter?.mixdrop) chapter.mixdrop = storedChapter.mixdrop;
            });

            // Push chapters to the array
            if (data) {
                chapters.push({
                    providerId: mapping.providerId,
                    chapters: data,
                });
            }
            return true;
        } catch (e) {
            return false;
        }
    });

    await Promise.all(promises);

    // Update the latestChapter for the media if it's not up to date.
    let updatedAt = (media as Manga).chapters.latest.updatedAt;
    let latestChapter = (media as Manga).chapters.latest.latestChapter;
    let latestTitle = (media as Manga).chapters.latest.latestTitle;

    for (const provider of chapters) {
        const latest = provider.chapters.reduce((prev, current) => (prev.number > current.number ? prev : current));
        if ((latest.number > latestChapter || (latest.number === latestChapter && latest.title !== latestTitle)) && !isNaN(Number(latest.updatedAt)) ? latest.updatedAt : 0 > updatedAt) {
            updatedAt = latest.updatedAt && !isNaN(Number(latest.updatedAt)) ? latest.updatedAt : 0;
            latestChapter = Number(latest.number);
            latestTitle = String(latest.title);
        }
    }

    const totalChapters = !(media as Manga).totalChapters || (media as Manga).totalChapters! < latestChapter ? latestChapter : (media as Manga).totalChapters;

    // Update the media info via information providers
    for (let j = 0; j < INFORMATION_PROVIDERS.length; j++) {
        const provider = INFORMATION_PROVIDERS[j];

        // Fetch info from provider
        const info = await provider.info(media).catch((err) => {
            console.log(colors.red(`Error while fetching info for ${media.id} from ${provider.id}`));
            console.error(err);
            return null;
        });

        if (!info) {
            continue;
        }

        // Fill the media object with all necessary info
        fillMediaInfo(media, info, provider);
    }

    Object.assign(media, {
        currentChapter: ((media as Manga).currentChapter ?? 0) < latestChapter ? latestChapter : (media as Manga).currentChapter,
        totalChapters,
        chapters: {
            latest: {
                latestChapter,
                latestTitle,
                updatedAt,
            },
            data: chapters,
        },
    });

    await update(media);
    return chapters;
};
