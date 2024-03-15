import { sqlite, dbType, postgres } from "../..";
import { Type } from "../../../types/enums";
import { Anime, AnimeInfo, Db, Manga, MangaInfo } from "../../../types/types";

export const seasonal = async (trending: AnimeInfo[] | MangaInfo[], popular: AnimeInfo[] | MangaInfo[], top: AnimeInfo[] | MangaInfo[], seasonal: AnimeInfo[] | MangaInfo[], fields: string[]) => {
    // Create a function to sort media by id
    const sortMediaById = (mediaArray: Anime[] | Manga[], ids: string[]) => {
        return ids.map((id) => (mediaArray as Array<Anime | Manga>).find((media: Anime | Manga) => media.id === id));
    };

    // Fetch all media based on their types
    const fetchMediaByType = async (type: Type, ids: string[]) => {
        if (dbType === "postgresql") {
            if (ids.length === 0) return undefined;

            if (type === Type.ANIME) {
                const query = `
                    SELECT * FROM "anime"
                    WHERE id IN (${ids.map((id) => `'${id}'`).join(", ")})
                    ORDER BY title->>'english' ASC
                `;

                const data: Anime[] = await postgres.query<Anime>(query).then((res) => res.rows);
                if (!data) return undefined;

                return data;
            } else {
                const query = `
                    SELECT * FROM "manga"
                    WHERE id IN (${ids.map((id) => `'${id}'`).join(", ")})
                    ORDER BY title->>'english' ASC
                `;

                const data: Manga[] = await postgres.query<Manga>(query).then((res) => res.rows);
                if (!data) return undefined;

                return data;
            }
        }

        return sqlite
            .query<Db<Anime> | Db<Manga>, []>(`SELECT * FROM ${type === Type.ANIME ? "anime" : "manga"} WHERE id IN (${ids.map((id) => `'${id}'`).join(", ")}) ORDER BY title->>'english' ASC`)
            .all()
            .map((media) => {
                if (media.type === Type.ANIME) {
                    try {
                        const parsedAnime = Object.assign(media, {
                            title: JSON.parse(media.title),
                            season: media.season.replace(/"/g, ""),
                            mappings: JSON.parse(media.mappings),
                            synonyms: JSON.parse(media.synonyms),
                            rating: JSON.parse(media.rating),
                            popularity: JSON.parse(media.popularity),
                            relations: JSON.parse(media.relations),
                            genres: JSON.parse(media.genres),
                            tags: JSON.parse(media.tags),
                            episodes: JSON.parse(media.episodes),
                            artwork: JSON.parse(media.artwork),
                            characters: JSON.parse(media.characters),
                        });
                        return parsedAnime as unknown as Anime;
                    } catch (e) {
                        return undefined;
                    }
                } else {
                    try {
                        const parsedManga = Object.assign(media, {
                            title: JSON.parse(media.title),
                            mappings: JSON.parse(media.mappings),
                            synonyms: JSON.parse(media.synonyms),
                            rating: JSON.parse(media.rating),
                            popularity: JSON.parse(media.popularity),
                            relations: JSON.parse(media.relations),
                            genres: JSON.parse(media.genres),
                            tags: JSON.parse(media.tags),
                            chapters: JSON.parse(media.chapters),
                            artwork: JSON.parse(media.artwork),
                            characters: JSON.parse(media.characters),
                        });

                        return parsedManga as unknown as Manga;
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

            if (fields && fields.length > 0) {
                // Delete fields that don't exist in the fields array
                Object.keys(media).forEach((key) => {
                    if (!fields.includes(key)) {
                        delete (media as { [key: string]: any })[key];
                    }
                });
            }
        });
    });

    return {
        trending: sortedTrending,
        popular: sortedPopular,
        top: sortedTop,
        seasonal: sortedSeasonal,
    };
};
