import { sqlite, dbType, postgres } from "../..";
import { Format, Sort, SortDirection, Type } from "../../../types/enums";
import { Anime, Db, Manga } from "../../../types/types";
import { generateSearchQueries, generateSearchWhere } from "./helper";

type ReturnType<T> = T extends Type.ANIME ? Anime[] : Manga[];

export const search = async <T extends Type.ANIME | Type.MANGA>(
    query: string,
    type: T,
    formats: Format[],
    page: number,
    perPage: number,
    sort: Sort,
    sortDirection: SortDirection,
): Promise<{
    results: ReturnType<T>;
    total: number;
    lastPage: number;
}> => {
    if (dbType === "postgresql") {
        const skip = page > 0 ? perPage * (page - 1) : 0;
        const where = generateSearchWhere(type === Type.ANIME ? "anime" : "manga", query, formats, sort);

        const queries = generateSearchQueries(type === Type.ANIME ? "anime" : "manga", where, query, sort, sortDirection, perPage, skip);

        // eslint-disable-next-line prefer-const
        let [count, results] = (await Promise.all([(await postgres.query(queries.countQuery, query.length > 0 ? [`%${query}`] : [])).rows, (await postgres.query(queries.sqlQuery, query.length > 0 ? [`%${query}`] : [])).rows])) as [any, any];

        if (sort === Sort.SCORE) {
            results = sortDirection === SortDirection.ASC ? results.sort((a: Anime | Manga, b: Anime | Manga) => Number(a.averageRating) - Number(b.averageRating)) : results.sort((a: Anime | Manga, b: Anime | Manga) => Number(b.averageRating) - Number(a.averageRating));
        }
        if (sort === Sort.POPULARITY) {
            results = sortDirection === SortDirection.ASC ? results.sort((a: Anime | Manga, b: Anime | Manga) => Number(a.averagePopularity) - Number(b.averagePopularity)) : results.sort((a: Anime | Manga, b: Anime | Manga) => Number(b.averagePopularity) - Number(a.averagePopularity));
        }
        if (sort === Sort.TOTAL_EPISODES) {
            results = sortDirection === SortDirection.ASC ? results.sort((a: Anime, b: Anime) => Number(a.totalEpisodes) - Number(b.totalEpisodes)) : results.sort((a: Anime, b: Anime) => Number(b.totalEpisodes) - Number(a.totalEpisodes));
        }
        if (sort === Sort.YEAR) {
            results = sortDirection === SortDirection.ASC ? results.sort((a: Anime | Manga, b: Anime | Manga) => Number(a.year) - Number(b.year)) : results.sort((a: Anime | Manga, b: Anime | Manga) => Number(b.year) - Number(a.year));
        }
        if (sort === Sort.TOTAL_CHAPTERS) {
            results = sortDirection === SortDirection.ASC ? results.sort((a: Manga, b: Manga) => Number(a.totalChapters) - Number(b.totalChapters)) : results.sort((a: Manga, b: Manga) => Number(b.totalChapters) - Number(a.totalChapters));
        }

        const total = Number((count as any)[0]?.count ?? 0);
        const lastPage = Math.ceil(Number(total) / perPage);

        return {
            results: results as unknown as ReturnType<T>,
            total: results.length,
            lastPage,
        };
    }
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

    const results = sqlite
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
            ORDER BY ${
                sort === Sort.POPULARITY
                    ? "averagePopularity"
                    : sort === Sort.SCORE
                    ? "averageRating"
                    : sort === Sort.TITLE
                    ? "title->>'english'"
                    : sort === Sort.TOTAL_CHAPTERS
                    ? "totalChapters"
                    : sort === Sort.TOTAL_EPISODES
                    ? "totalEpisodes"
                    : sort === Sort.TOTAL_VOLUMES
                    ? "totalVolumes"
                    : sort === Sort.YEAR
                    ? "year"
                    : ""
            } ${sortDirection}
            LIMIT $limit OFFSET $offset`,
        )
        .all({ $query: query, $limit: perPage, $offset: skip });

    const parsedResults = results.map((data) => {
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

    return {
        results: parsedResults as unknown as ReturnType<T>,
        total: parsedResults.length,
        lastPage: -1,
    };
};
