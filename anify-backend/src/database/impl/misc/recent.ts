import { db } from "../..";
import { Format, Type } from "../../../types/enums";
import { Anime, Manga } from "../../../types/types";

export const recent = async (type: Type, formats: Format[], page: number, perPage: number): Promise<Anime[] | Manga[]> => {
    const skip = page > 0 ? perPage * (page - 1) : 0;

    const formatParams = formats.map((f) => `'${f}'`).join(", ");

    let sql = "";
    let countSql = "";

    if (type === Type.ANIME) {
        sql = `
            SELECT * FROM "anime"
            WHERE "format" IN (${formatParams})
            ORDER BY "latest" DESC
            LIMIT ${perPage}
            OFFSET ${skip};
        `;

        countSql = `
            SELECT COUNT(*) FROM "anime"
            WHERE "format" IN (${formatParams});
        `;
    } else {
        sql = `
            SELECT * FROM "manga"
            WHERE "format" IN (${formatParams})
            ORDER BY "latest" DESC
            LIMIT ${perPage}
            OFFSET ${skip};
        `;

        countSql = `
            SELECT COUNT(*) FROM "manga"
            WHERE "format" IN (${formatParams});
        `;
    }

    const [countResults, results] = await Promise.all([Promise.resolve(db.query(countSql).get()), Promise.resolve(db.query(sql).all())]);

    const total = Number(Object.values(countResults ?? {})[0]);
    const lastPage = Math.ceil(Number(total) / perPage);

    const newResults: any[] = [];
    for (const media of results as Anime[] | Manga[]) {
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
            } catch (e) {
                continue;
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
            } catch (e) {
                continue;
            }
        }
        if ((media as Anime).episodes?.latest?.latestEpisode === 0 || (media as Manga).chapters?.latest?.latestChapter === 0) continue;

        const updatedAt = media.type === Type.ANIME ? (media as Anime).episodes.latest.updatedAt : (media as Manga).chapters.latest.updatedAt;

        newResults.push({
            ...media,
            updatedAt: String(updatedAt).length === 0 ? 0 : new Date(Number(updatedAt)).getTime(),
        });
    }

    // Sort by updatedAt
    newResults.sort((a, b) => (b.updatedAt as number) - (a.updatedAt as number));

    // Remove updatedAt
    for (const result of newResults) {
        delete result.updatedAt;
    }

    return newResults;
};
