import { get } from "../../database/impl/modify/get";
import { update } from "../../database/impl/modify/update";
import { fillMediaInfo } from "../../lib/impl/mappings";
import { INFORMATION_PROVIDERS, mangaProviders } from "../../mappings";
import { ChapterData, Manga } from "../../types/types";
import colors from "colors";

export const fetchChapters = async (id: string): Promise<ChapterData[]> => {
    const media = await get(id);
    if (!media) return [];

    const mappings = media.mappings;
    const chapters: ChapterData[] = [];

    const promises: Promise<boolean>[] = mappings.map(async (mapping) => {
        const provider = mangaProviders[mapping.providerId];

        if (!provider) return false;

        try {
            const data = await provider.fetchChapters(String(mapping.id)).catch(() => []);
            if (data && data.length === 0) return true;

            data?.map((chapter) => {
                if (!chapter.updatedAt) chapter.updatedAt = 0;
            });

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

    const totalEpisodes = !(media as Manga).totalChapters || (media as Manga).totalChapters! < latestChapter ? latestChapter : (media as Manga).totalChapters;

    for (let j = 0; j < INFORMATION_PROVIDERS.length; j++) {
        const provider = INFORMATION_PROVIDERS[j];
        // Fetch info baesd on the media
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
        currentChapter: (media as Manga).currentChapter ?? latestChapter,
        totalEpisodes,
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
