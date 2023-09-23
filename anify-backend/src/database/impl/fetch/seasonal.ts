import { db } from "../..";
import { Type } from "../../../types/enums";
import { Anime, AnimeInfo, Manga, MangaInfo } from "../../../types/types";

export const seasonal = async (trending: AnimeInfo[] | MangaInfo[], popular: AnimeInfo[] | MangaInfo[], top: AnimeInfo[] | MangaInfo[], seasonal: AnimeInfo[] | MangaInfo[], fields: string[]) => {
    // Create a function to sort media by id
    const sortMediaById = (mediaArray: Anime[] | Manga[], ids: string[]) => {
        return ids.map((id) => (mediaArray as any[]).find((media: Anime | Manga) => String(media.id) === id));
    };

    // Fetch all media based on their types
    const fetchMediaByType = async (type: Type, ids: string[]) => {
        return ((await db.query(`SELECT * FROM ${type === Type.ANIME ? "anime" : "manga"} WHERE id IN (${ids.map((id) => `'${id}'`).join(", ")}) ORDER BY title->>'english' ASC`)).all() as Anime[] | Manga[])
            .map((media) => {
                if (media.type === Type.ANIME) {
                    try {
                        Object.assign(media, {
                            title: JSON.parse((media as any).title),
                            season: (media as any).season.replace(/"/g, ""),
                            mappings: JSON.parse((media as any).mappings),
                            synonyms: JSON.parse((media as any).synonyms),
                            rating: JSON.parse((media as any).rating),
                            popularity: JSON.parse((media as any).popularity),
                            relations: JSON.parse((media as any).relations),
                            genres: JSON.parse((media as any).genres),
                            tags: JSON.parse((media as any).tags),
                            episodes: JSON.parse((media as any).episodes),
                            artwork: JSON.parse((media as any).artwork),
                            characters: JSON.parse((media as any).characters),
                        });
                        return media as Anime;
                    } catch (e) {
                        return undefined;
                    }
                } else {
                    try {
                        Object.assign(media, {
                            title: JSON.parse((media as any).title),
                            mappings: JSON.parse((media as any).mappings),
                            synonyms: JSON.parse((media as any).synonyms),
                            rating: JSON.parse((media as any).rating),
                            popularity: JSON.parse((media as any).popularity),
                            relations: JSON.parse((media as any).relations),
                            genres: JSON.parse((media as any).genres),
                            tags: JSON.parse((media as any).tags),
                            chapters: JSON.parse((media as any).chapters),
                            artwork: JSON.parse((media as any).artwork),
                            characters: JSON.parse((media as any).characters),
                        });

                        return media as Manga;
                    } catch (e) {
                        return undefined;
                    }
                }
            })
            .filter(Boolean);
    };

    // Fetch media for each category
    const [trend, pop, t, season] = await Promise.all([
        fetchMediaByType(
            trending[0]?.type,
            trending.map((a) => String(a.id)),
        ),
        fetchMediaByType(
            popular[0]?.type,
            popular.map((a) => String(a.id)),
        ),
        fetchMediaByType(
            top[0]?.type,
            top.map((a) => String(a.id)),
        ),
        fetchMediaByType(
            seasonal[0]?.type,
            seasonal.map((a) => String(a.id)),
        ),
    ]);

    // Sort media arrays based on passed-in values
    const sortedTrending = sortMediaById(
        trend as Anime[] | Manga[],
        trending.map((a) => String(a.id)),
    ).filter(Boolean);
    const sortedPopular = sortMediaById(
        pop as Anime[] | Manga[],
        popular.map((a) => String(a.id)),
    ).filter(Boolean);
    const sortedTop = sortMediaById(
        t as Anime[] | Manga[],
        top.map((a) => String(a.id)),
    ).filter(Boolean);
    const sortedSeasonal = sortMediaById(
        season as Anime[] | Manga[],
        seasonal.map((a) => String(a.id)),
    ).filter(Boolean);

    [sortedTrending, sortedPopular, sortedTop, sortedSeasonal].forEach((mediaArray) => {
        mediaArray.forEach((media) => {
            if (!media) return;

            // Delete fields that don't exist in the fields array
            Object.keys(media).forEach((key) => {
                if (!fields.includes(key)) {
                    delete media[key];
                }
            });
        });
    });

    return {
        trending: sortedTrending,
        popular: sortedPopular,
        top: sortedTop,
        seasonal: sortedSeasonal,
    };
};
