import { db } from "../..";
import { Type } from "../../../types/enums";
import { Anime, AnimeInfo, Manga, MangaInfo } from "../../../types/types";

// TODO: Add fields to query specific to anime/manga.
// For example, if people only want bannerImage/coverImage
// it should be possible to only query those fields
export const seasonal = async (trending: AnimeInfo[] | MangaInfo[], popular: AnimeInfo[] | MangaInfo[], top: AnimeInfo[] | MangaInfo[], seasonal: AnimeInfo[] | MangaInfo[]) => {
    // Create a function to sort media by id
    const sortMediaById = (mediaArray: Anime[] | Manga[], ids: string[]) => {
        return ids.map((id) => (mediaArray as any[]).find((media: Anime | Manga) => String(media.id) === id));
    };

    // Fetch all media based on their types
    const fetchMediaByType = async (type: Type, ids: string[]) => {
        return (await db.query(`SELECT * FROM ${type === Type.ANIME ? "anime" : "manga"} WHERE id IN (${ids.map((id) => `'${id}'`).join(", ")}) ORDER BY title->>'english' ASC`)).all() as Anime[] | Manga[];
    };

    // Fetch media for each category
    const [trend, pop, t, season] = await Promise.all([
        fetchMediaByType(
            trending[0].type,
            trending.map((a) => String(a.id)),
        ),
        fetchMediaByType(
            popular[0].type,
            popular.map((a) => String(a.id)),
        ),
        fetchMediaByType(
            top[0].type,
            top.map((a) => String(a.id)),
        ),
        fetchMediaByType(
            seasonal[0].type,
            seasonal.map((a) => String(a.id)),
        ),
    ]);

    // Sort media arrays based on passed-in values
    const sortedTrending = sortMediaById(
        trend,
        trending.map((a) => String(a.id)),
    );
    const sortedPopular = sortMediaById(
        pop,
        popular.map((a) => String(a.id)),
    );
    const sortedTop = sortMediaById(
        t,
        top.map((a) => String(a.id)),
    );
    const sortedSeasonal = sortMediaById(
        season,
        seasonal.map((a) => String(a.id)),
    );

    // Reset characters array for each media
    [sortedTrending, sortedPopular, sortedTop, sortedSeasonal].forEach((mediaArray) => {
        mediaArray.forEach((media) => {
            // Assign fields here
        });
    });

    return {
        trending: sortedTrending,
        popular: sortedPopular,
        top: sortedTop,
        seasonal: sortedSeasonal,
    };
};
