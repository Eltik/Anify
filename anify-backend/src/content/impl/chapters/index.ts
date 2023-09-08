import AniList from "@/src/mapping/impl/information/anilist";
import { Manga, Type, mangaProviders } from "../../../mapping";
import Database from "@/src/database";
import { Chapter } from "@/src/mapping/impl/manga";

export const fetchChapters = async (id: string): Promise<ChapterData[]> => {
    const media = await Database.info(id);
    if (!media) return [];

    const mappings = media.mappings;

    const chapters: ChapterData[] = [];

    const promises: Promise<boolean>[] = mappings.map(async (mapping) => {
        const provider = mangaProviders[mapping.providerId];

        if (!provider) return false;

        try {
            const data = await provider.fetchChapters(String(mapping.id)).catch(() => []);
            if (data && data.length === 0) return true;

            data?.map((chapter: Chapter) => {
                if (!chapter.updatedAt) chapter.updatedAt = 0;

                const mixdrop = (media as Manga).chapters.data.find((x) => x.providerId === mapping.providerId)?.chapters.find((x) => x.id === chapter.id)?.mixdrop;
                chapter.mixdrop = mixdrop;
            });

            if (data) {
                chapters.push({
                    providerId: mapping.providerId,
                    chapters: data,
                });
            }
            return true;
        } catch (e) {
            //console.log(colors.red(`Failed to fetch chapters for ${mapping.providerId} ${mapping.id}`))
            return false;
        }
    });

    await Promise.all(promises);

    // Check if chapters length are different than before
    let updatedAt = (media as Manga).chapters.latest.updatedAt;
    let latestChapter = (media as Manga).chapters.latest.latestChapter;
    let latestTitle = (media as Manga).chapters.latest.latestTitle;

    if (chapters.length != 0) {
        if ((media as Manga).chapters.data.length != 0) {
            for (const provider of (media as Manga).chapters.data) {
                const providerChapters = provider.chapters;
                const providerId = provider.providerId;
                for (const provider of chapters) {
                    if (provider.providerId === providerId) {
                        //if (provider.chapters.length > providerChapters.length) {
                        // Find the latest chapter
                        const latest = provider.chapters.reduce((prev, current) => (prev.number > current.number ? prev : current));
                        if ((latest.updatedAt ?? 0) > updatedAt && (latest.number > latestChapter || (latest.number === latestChapter && latest.title !== latestTitle)) && latest.updatedAt && !isNaN(Number(latest.updatedAt)) ? latest.updatedAt : 0 > updatedAt) {
                            updatedAt = latest.updatedAt && !isNaN(Number(latest.updatedAt)) ? latest.updatedAt : 0;
                            latestChapter = Number(latest.number);
                            latestTitle = String(latest.title);
                        }
                        //}
                    }
                }
            }
        } else {
            updatedAt = 0;
            latestChapter = 0;
            latestTitle = "";

            for (const provider of chapters) {
                const latest = provider.chapters.reduce((prev, current) => (prev.number > current.number ? prev : current));
                if ((latest.updatedAt ?? 0) > updatedAt && latest.updatedAt && !isNaN(Number(latest.updatedAt)) ? latest.updatedAt : 0 > updatedAt) {
                    updatedAt = latest.updatedAt && !isNaN(Number(latest.updatedAt)) ? latest.updatedAt : 0;
                    latestChapter = Number(latest.number);
                    latestTitle = String(latest.title);
                }
            }
        }
    }

    if (latestChapter === 0) (latestChapter = (media as Manga).chapters.latest.latestChapter), (latestTitle = (media as Manga).chapters.latest.latestTitle), (updatedAt = updatedAt === 0 && (media as Manga).chapters.latest.updatedAt !== 0 ? (media as Manga).chapters.latest.updatedAt : updatedAt);

    const aniList = new AniList();
    const anilistMedia = await aniList.getMedia(id);

    // Update basic information
    await Database.update(id, Type.MANGA, {
        status: anilistMedia?.status ?? media.status,
        rating: {
            anilist: anilistMedia?.rating ?? media.rating.anilist,
            kitsu: media.rating.kitsu,
            mal: media.rating.mal,
        },
        popularity: {
            anilist: anilistMedia?.popularity ?? media.popularity.anilist,
            kitsu: media.popularity.kitsu,
            mal: media.popularity.mal,
        },
        chapters: {
            latest: {
                updatedAt,
                latestChapter,
                latestTitle,
            },
            data: chapters,
        },
        totalChapters: !(media as Manga).totalChapters || (media as Manga).totalChapters! < latestChapter ? latestChapter : (media as Manga).totalChapters,
    });

    return chapters;
};

export type ChapterData = {
    providerId: string;
    chapters: Chapter[];
};
