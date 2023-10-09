import { db } from "../..";
import { Format, Type } from "../../../types/enums";
import { Anime, Db, Manga } from "../../../types/types";

type ReturnType<T> = T extends Type.ANIME ? Anime[] : Manga[];

export const search = async <T extends Type.ANIME | Type.MANGA>(query: string, type: T, formats: Format[], page: number, perPage: number): Promise<ReturnType<T>> => {
    const skip = page > 0 ? perPage * (page - 1) : 0;

    const where = `
        WHERE
        (
            EXISTS (
                SELECT 1
                FROM json_each(synonyms) AS s
                WHERE s.value LIKE $query
            )
            OR title->>'english' LIKE $query
            OR title->>'romaji' LIKE $query
            OR title->>'native' LIKE $query
        )
        ${formats?.length > 0 ? `AND "format" IN (${formats.map((f) => `'${f}'`).join(", ")})` : ""}
    `;

    const results = db
        .query<
            Db<Anime> | Db<Manga>,
            {
                $query: string;
                $limit: number;
                $offset: number;
            }
        >(
            `SELECT *
                FROM ${type === Type.ANIME ? "anime" : "manga"}
                ${where}
            ORDER BY title->>'english' ASC
            LIMIT $limit OFFSET $offset`,
        )
        .all({ $query: query, $limit: perPage, $offset: skip });

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
