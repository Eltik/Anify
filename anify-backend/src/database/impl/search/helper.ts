import { Format, Genres, Season, Sort, SortDirection } from "../../../types/enums";

export const generateSearchWhere = (type: "anime" | "manga", query: string, formats: Format[], sort: Sort) => {
    return `WHERE
        (
            ${query.length > 0 ? `$1` : `'%'`} ILIKE ANY("${type}".synonyms)
            OR  ${query.length > 0 ? `$1` : `'%'`}    % ANY("${type}".synonyms)
            OR "${type}".title->>'english' ILIKE ${query.length > 0 ? "$1" : "'%'"}
            OR "${type}".title->>'romaji' ILIKE ${query.length > 0 ? "$1" : "'%'"}
            OR "${type}".title->>'native' ILIKE ${query.length > 0 ? "$1" : "'%'"}
        )
        ${
            formats.length > 0
                ? `AND (
            "${type}"."format" IN (${formats.map((f) => `'${f}'`).join(",")})
        )`
                : ""
        }
        ${sort && sort === Sort.YEAR ? `AND "${type}"."year" IS NOT NULL` : ""}`;
};

export const generateAdvancedSearchWhere = (type: "anime" | "manga", query: string, formats: Format[], genres: Genres[] = [], genresExcluded: Genres[] = [], season: Season = Season.UNKNOWN, year = 0, tags: string[] = [], tagsExcluded: string[] = [], sort: Sort = Sort.TITLE) => {
    return `WHERE
        (
            ${query.length > 0 ? `$1` : `'%'`} ILIKE ANY("${type}".synonyms)
            OR  ${query.length > 0 ? `$1` : `'%'`}    % ANY("${type}".synonyms)
            OR "${type}".title->>'english' ILIKE ${query.length > 0 ? "$1" : "'%'"}
            OR "${type}".title->>'romaji' ILIKE ${query.length > 0 ? "$1" : "'%'"}
            OR "${type}".title->>'native' ILIKE ${query.length > 0 ? "$1" : "'%'"}
        )
        ${
            formats.length > 0
                ? `AND (
            "${type}"."format" IN (${formats.map((f) => `'${f}'`).join(",")})
        )`
                : ""
        }
        ${genres && genres.length > 0 ? `AND ARRAY[${genres.map((g) => `'${g}'`)}] <@ "${type}"."genres"` : ""}
        ${genresExcluded.length > 0 ? `AND NOT ARRAY[${genresExcluded.map((g) => `'${g}'`)}] && "${type}"."genres"` : ""}
        ${tags && tags.length > 0 ? `AND ARRAY[${tags.map((g) => `'${g}'`)}] <@ "${type}"."tags"` : ""}
        ${tagsExcluded.length > 0 ? `AND NOT ARRAY[${tagsExcluded.map((g) => `'${g}'`)}] && "${type}"."tags"` : ""}
        ${season && season !== Season.UNKNOWN ? `AND "${type}"."season" = '${season}'` : ""}
        ${year > 0 ? `AND "${type}"."year" = ${year}` : ""}
        ${sort && sort === Sort.YEAR ? `AND "${type}"."year" IS NOT NULL` : ""}`;
};

export const generateSearchQueries = (type: "anime" | "manga", where: string, query: string, sort: Sort = Sort.TITLE, sortDirection: SortDirection = SortDirection.DESC, perPage: number, skip: number) => {
    const countQuery = `
        SELECT COUNT(*) FROM "${type}"
        ${where}
    `;
    const sqlQuery = `
        SELECT *
        FROM (
            SELECT
                *,
                RANK() OVER (
                    ORDER BY
                        ${
                            query.length > 0
                                ? `(CASE WHEN "${type}".title->>'english' IS NOT NULL THEN similarity(LOWER("${type}".title->>'english'), LOWER(${query.length > 0 ? `$1` : "'%'"})) ELSE 0 END,
                                    + CASE WHEN "${type}".title->>'romaji' IS NOT NULL THEN similarity(LOWER("${type}".title->>'romaji'), LOWER(${query.length > 0 ? `$1` : "'%'"})) ELSE 0 END,
                                    + CASE WHEN "${type}".title->>'native' IS NOT NULL THEN similarity(LOWER("${type}".title->>'native'), LOWER(${query.length > 0 ? `$1` : "'%'"})) ELSE 0 END,
                                    + CASE WHEN synonyms IS NOT NULL THEN most_similar(LOWER(${query.length > 0 ? `$1` : "'%'"}), synonyms) ELSE 0 END)
                                DESC,
                                "${type}".id
                                `
                                : `
                            ${
                                sort === Sort.SCORE
                                    ? `CAST("${type}"."averageRating" AS NUMERIC)`
                                    : sort === Sort.POPULARITY
                                    ? `CAST("${type}"."averagePopularity" AS NUMERIC)`
                                    : sort === Sort.TOTAL_EPISODES
                                    ? `CAST("${type}"."totalEpisodes" AS NUMERIC)`
                                    : sort === Sort.YEAR
                                    ? `CAST("${type}"."year" AS NUMERIC)`
                                    : sort === Sort.TOTAL_CHAPTERS
                                    ? `CAST("${type}"."totalChapters" AS NUMERIC)`
                                    : sort === Sort.TOTAL_VOLUMES
                                    ? `CAST("${type}"."totalVolumes" AS NUMERIC)`
                                    : `
                                (CASE WHEN "${type}".title->>'english' IS NOT NULL THEN similarity(LOWER("${type}".title->>'english'), LOWER(${query.length > 0 ? `$1` : "'%'"})) ELSE 0 END,
                                + CASE WHEN "${type}".title->>'romaji' IS NOT NULL THEN similarity(LOWER("${type}".title->>'romaji'), LOWER(${query.length > 0 ? `$1` : "'%'"})) ELSE 0 END,
                                + CASE WHEN "${type}".title->>'native' IS NOT NULL THEN similarity(LOWER("${type}".title->>'native'), LOWER(${query.length > 0 ? `$1` : "'%'"})) ELSE 0 END,
                                + CASE WHEN synonyms IS NOT NULL THEN most_similar(LOWER(${query.length > 0 ? `$1` : "'%'"}), synonyms) ELSE 0 END)`
                            }
                            ${sortDirection === SortDirection.ASC ? "ASC" : "DESC"},
                            "${type}".id  -- Add the anime ID as a fallback sorting criterion
                            `
                        }
                ) AS rnk
            FROM "${type}"
            ${where}
        ) AS ranked_anime
        WHERE rnk <= ${skip + perPage}
            AND rnk > ${skip}
    `;

    return {
        countQuery,
        sqlQuery,
    };
};
