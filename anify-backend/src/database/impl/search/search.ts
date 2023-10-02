import { db } from "../..";
import { Format, Type } from "../../../types/enums";
import { Anime, Db, Manga } from "../../../types/types";

type ReturnType<T> = T extends "ANIME" ? Anime[] : Manga[];

export const search = async <T extends "ANIME" | "MANGA">(query: string, type: T, formats: Format[], page: number, perPage: number): Promise<ReturnType<T>> => {
    const skip = page > 0 ? perPage * (page - 1) : 0;

    const where = `
        WHERE
        ${type === Type.ANIME ? "anime_fts" : "manga_fts"} MATCH
        'title:${query}*' OR ${type === Type.ANIME ? "anime_fts" : "manga_fts"} MATCH
        'synonyms:${query}*'
        ${formats?.length > 0 ? `AND "format" IN (${formats.map((f) => `'${f}'`).join(", ")})` : ""}
    `;

    const results = db
        .query<Db<Anime> | Db<Manga>, { $query: string }>(
            `
        SELECT *,
            bm25(
              ${type === Type.ANIME ? "anime_fts" : "manga_fts"},
              1.0 + 0.1 * (
                SELECT COUNT(*) FROM ${type === Type.ANIME ? "anime_fts" : "manga_fts"}
              ) / (SELECT COUNT(*) FROM ${type === Type.ANIME ? "anime" : "manga"})
            ) as bm25_rank
        FROM ${type === Type.ANIME ? "anime_fts" : "manga_fts"} ${where}
        ORDER BY bm25_rank DESC, title->>'english' ASC
        LIMIT ${perPage} OFFSET ${skip}`,
        )
        .all({
            $query: query,
        });

    let parsedResults = results.map((data) => {
        try {
            if (data.type === Type.ANIME) {
                Object.assign(data, {
                    title: JSON.parse(data.title),
                    season: data.season.replace(/"/g, ""),
                    mappings: JSON.parse(data.mappings),
                    synonyms: JSON.parse(data.synonyms),
                    rating: JSON.parse(data.rating),
                    popularity: JSON.parse(data.popularity),
                    relations: JSON.parse(data.relations),
                    genres: JSON.parse(data.genres),
                    tags: JSON.parse(data.tags),
                    episodes: JSON.parse(data.episodes),
                    artwork: JSON.parse(data.artwork),
                    characters: JSON.parse(data.characters),
                });

                return data;
            } else {
                Object.assign(data, {
                    title: JSON.parse(data.title),
                    mappings: JSON.parse(data.mappings),
                    synonyms: JSON.parse(data.synonyms),
                    rating: JSON.parse(data.rating),
                    popularity: JSON.parse(data.popularity),
                    relations: JSON.parse(data.relations),
                    genres: JSON.parse(data.genres),
                    tags: JSON.parse(data.tags),
                    chapters: JSON.parse(data.chapters),
                    artwork: JSON.parse(data.artwork),
                    characters: JSON.parse(data.characters),
                });

                return data;
            }
        } catch (e) {
            return undefined;
        }
    });

    return parsedResults as unknown as ReturnType<T>;
};
