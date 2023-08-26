import { mangaProviders } from "../../../mapping";
import { Chapter, Page } from "../../../mapping/impl/manga";
import { fetchChapters } from "../chapters";
import queues from "../../../worker";

export const fetchPages = async (id: string, providerId: string, readId: string): Promise<Page[] | string | null> => {
    const provider = mangaProviders[providerId];

    if (!provider) return null;

    const chapters = await fetchChapters(id);

    let chapter: Chapter | null = null;
    for (const provider of chapters) {
        if (provider.providerId === providerId) {
            const chapData = provider.chapters;
            for (const chap of chapData) {
                if (chap.id === readId) {
                    chapter = chap;
                    break;
                }
            }
        }
    }

    try {
        const data = await provider.fetchPages(readId).catch((err) => {
            return null;
        });
        if (!data) return null;

        if (chapter) await queues.uploadPages.add({ id, providerId, chapter, readId, pages: (data as Page[]) ?? [] });

        return data;
    } catch (e) {
        return [];
    }
};
