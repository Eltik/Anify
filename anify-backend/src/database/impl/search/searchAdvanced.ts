import { db } from "../..";
import { Format, Genres, Type } from "../../../types/enums";
import { Anime, Db, Manga } from "../../../types/types";

type ReturnType<T> = T extends Type.ANIME ? Anime[] : Manga[];

export const searchAdvanced = async <T extends Type.ANIME | Type.MANGA>(query: string, type: T, formats: Format[], page: number, perPage: number, genres: Genres[] = [], genresExcluded: Genres[] = [], year = 0, tags: string[] = [], tagsExcluded: string[] = []) => {
    const skip = page > 0 ? perPage * (page - 1) : 0;

    let where = `
        WHERE
        (
            EXISTS (
                SELECT 1
                FROM json_each(synonyms) AS s
                WHERE s.value LIKE '%' || $query || '%'
            )
            OR title->>'english' LIKE '%' || $query || '%'
            OR title->>'romaji' LIKE '%' || $query || '%'
            OR title->>'native' LIKE '%' || $query || '%'
        )
        ${formats?.length > 0 ? `AND "format" IN (${formats.map((f) => `'${f}'`).join(", ")})` : ""}
    `;

    if (genres && genres.length > 0) {
        let genreWhere = "";
        for (let i = 0; i < genres.length; i++) {
            genreWhere += `genres LIKE '%${genres[i]}%'`;
            if (i < genres.length - 1) {
                genreWhere += " AND ";
            }
        }
        where += `AND (${genreWhere})`;
    }

    if (genresExcluded && genresExcluded.length > 0) {
        let genreWhere = "";
        for (let i = 0; i < genresExcluded.length; i++) {
            genreWhere += `genres NOT LIKE '%${genresExcluded[i]}%'`;
            if (i < genresExcluded.length - 1) {
                genreWhere += " AND ";
            }
        }
        where += `AND (${genreWhere})`;
    }

    if (tags && tags.length > 0) {
        let tagsWhere = "";
        for (let i = 0; i < tags.length; i++) {
            tagsWhere += `tags LIKE '%${tags[i]}%'`;
            if (i < tags.length - 1) {
                tagsWhere += " AND ";
            }
        }
        where += `AND (${tagsWhere})`;
    }

    if (tags && tags.length > 0) {
        let tagsWhere = "";
        for (let i = 0; i < tags.length; i++) {
            tagsWhere += `tags NOT LIKE '%${tagsExcluded[i]}%'`;
            if (i < tags.length - 1) {
                tagsWhere += " AND ";
            }
        }
        where += `AND (${tagsWhere})`;
    }

    try {
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
    } catch (e) {
        console.error(e);
        return [];
    }
};
