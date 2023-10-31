import { sqlite, dbType, postgres } from "../..";
import { Format, Genres, Sort, SortDirection, Type } from "../../../types/enums";
import { Anime, Db, Manga } from "../../../types/types";

type ReturnType<T> = T extends Type.ANIME ? Anime[] : Manga[];

export const searchAdvanced = async <T extends Type.ANIME | Type.MANGA>(query: string, type: T, formats: Format[], page: number, perPage: number, genres: Genres[] = [], genresExcluded: Genres[] = [], year = 0, tags: string[] = [], tagsExcluded: string[] = [], sort: Sort = Sort.POPULARITY, sortDirection: SortDirection = SortDirection.DESC) => {
    if (dbType === "postgresql") {
        const skip = page > 0 ? perPage * (page - 1) : 0;
        let where;

        if (type === Type.ANIME) {
            where = `
                WHERE
                (
                    ${query.length > 0 ? `%${query}%` : `'%'`}        ILIKE ANY("anime".synonyms)
                    OR  ${query.length > 0 ? `%${query}%` : `'%'`}    % ANY("anime".synonyms)
                    OR  "anime".title->>'english' ILIKE ${query.length > 0 ? `%${query}%` : `'%'`}
                    OR  "anime".title->>'romaji'  ILIKE ${query.length > 0 ? `%${query}%` : `'%'`}
                    OR  "anime".title->>'native'  ILIKE ${query.length > 0 ? `%${query}%` : `'%'`}
                )
                ${formats.length > 0 ? `AND "anime"."format" IN (${formats.map((f) => `'${f}'`)})` : ""}
                ${genres && genres.length > 0 ? `AND ARRAY[${genres.map((g) => `'${g}'`)}] <@ "anime"."genres"` : ""}
                ${genresExcluded.length > 0 ? `AND NOT ARRAY[${genresExcluded.map((g) => `'${g}'`)}] <@ "anime"."genres"` : ""}
                ${tags && tags.length > 0 ? `AND ARRAY[${tags.map((g) => `'${g}'`)}] <@ "anime"."tags"` : ""}
                ${tagsExcluded.length > 0 ? `AND NOT ARRAY[${tagsExcluded.map((g) => `'${g}'`)}] <@ "anime"."tags"` : ""}
                ${year > 0 ? `AND "anime"."year" = ${year}` : ""}
                ${sort && sort === Sort.YEAR ? `AND "anime"."year" IS NOT NULL` : ""}
            `;
        } else {
            where = `
                WHERE
                (
                    ${query.length > 0 ? `%${query}%` : `'%'`}        ILIKE ANY("manga".synonyms)
                    OR  ${query.length > 0 ? `%${query}%` : `'%'`}    % ANY("manga".synonyms)
                    OR  "manga".title->>'english' ILIKE ${query.length > 0 ? `%${query}%` : `'%'`}
                    OR  "manga".title->>'romaji'  ILIKE ${query.length > 0 ? `%${query}%` : `'%'`}
                    OR  "manga".title->>'native'  ILIKE ${query.length > 0 ? `%${query}%` : `'%'`}
                )
                ${formats.length > 0 ? `AND "manga"."format" IN (${formats.map((f) => `'${f}'`)})` : ""}
                ${genres && genres.length > 0 ? `AND ARRAY[${genres.map((g) => `'${g}'`)}] <@ "manga"."genres"` : ""}
                ${genresExcluded.length > 0 ? `AND NOT ARRAY[${genresExcluded.map((g) => `'${g}'`)}] <@ "manga"."genres"` : ""}
                ${tags && tags.length > 0 ? `AND ARRAY[${tags.map((g) => `'${g}'`)}] <@ "manga"."tags"` : ""}
                ${tagsExcluded.length > 0 ? `AND NOT ARRAY[${tagsExcluded.map((g) => `'${g}'`)}] <@ "manga"."tags"` : ""}
                ${year > 0 ? `AND "manga"."year" = ${year}` : ""}
                ${sort && sort === Sort.YEAR ? `AND "manga"."year" IS NOT NULL` : ""}
            `;
        }

        let [count, results] = [0, []];
        if (type === Type.ANIME) {
            const countQuery = `
                SELECT COUNT(*) FROM "anime"
                ${where}
            `;
            const sqlQuery = `
                SELECT * FROM "anime"
                ${where}
                ORDER BY
                    (CASE WHEN "anime".title->>'english' IS NOT NULL THEN similarity(LOWER("anime".title->>'english'), LOWER(${query.length > 0 ? query : "'%'"})) ELSE 0 END,
                    + CASE WHEN "anime".title->>'romaji' IS NOT NULL THEN similarity(LOWER("anime".title->>'romaji'), LOWER(${query.length > 0 ? query : "'%'"})) ELSE 0 END,
                    + CASE WHEN "anime".title->>'native' IS NOT NULL THEN similarity(LOWER("anime".title->>'native'), LOWER(${query.length > 0 ? query : "'%'"})) ELSE 0 END,
                    + CASE WHEN synonyms IS NOT NULL THEN most_similar(LOWER(${query.length > 0 ? query : "'%'"}), synonyms) ELSE 0 END)
                        DESC,
                        ${sort === Sort.SCORE ? `"anime"."averageRating"` : sort === Sort.POPULARITY ? `"anime"."averagePopularity"` : sort === Sort.TOTAL_EPISODES ? `"anime"."totalEpisodes"` : sort === Sort.YEAR ? `"anime".year` : ""}
                    ${sortDirection === SortDirection.ASC ? "ASC" : "DESC"}
                LIMIT    ${perPage}
                OFFSET   ${skip}
            `;

            [count, results] = (await Promise.all([postgres.query(countQuery), postgres.query(sqlQuery)])) as [any, any];
        } else {
            const countQuery = `
                SELECT COUNT(*) FROM "manga"
                ${where}
            `;
            const sqlQuery = `
                SELECT * FROM "manga"
                ${where}
                ORDER BY
                    (CASE WHEN "manga".title->>'english' IS NOT NULL THEN similarity(LOWER("manga".title->>'english'), LOWER(${query.length > 0 ? query : "'%'"})) ELSE 0 END,
                    + CASE WHEN "manga".title->>'romaji' IS NOT NULL THEN similarity(LOWER("manga".title->>'romaji'), LOWER(${query.length > 0 ? query : "'%'"})) ELSE 0 END,
                    + CASE WHEN "manga".title->>'native' IS NOT NULL THEN similarity(LOWER("manga".title->>'native'), LOWER(${query.length > 0 ? query : "'%'"})) ELSE 0 END,
                    + CASE WHEN synonyms IS NOT NULL THEN most_similar(LOWER(${query.length > 0 ? query : "'%'"}), synonyms) ELSE 0 END)
                        DESC,
                    ${sort === Sort.SCORE ? `"manga"."averageRating"` : sort === Sort.POPULARITY ? `"manga"."averagePopularity"` : sort === Sort.TOTAL_CHAPTERS ? `"manga"."totalChapters"` : sort === Sort.TOTAL_VOLUMES ? `"manga"."totalVolumes"` : sort === Sort.YEAR ? `"manga".year` : ""}
                    ${sortDirection === SortDirection.ASC ? "ASC" : "DESC"}
                LIMIT    ${perPage}
                OFFSET   ${skip}
            `;

            [count, results] = (await Promise.all([(await postgres.query(countQuery)).rows, (await postgres.query(sqlQuery)).rows])) as [any, any];
        }

        const total = Number((count as any)[0]?.count ?? 0);
        const lastPage = Math.ceil(Number(total) / perPage);

        return results;
    }

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
                ORDER BY ${sort} ${sortDirection}
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
