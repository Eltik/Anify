import { Prisma } from "@prisma/client";
import { db, dbType, prisma } from "../..";
import { Format, Genres, Sort, SortDirection, Type } from "../../../types/enums";
import { Anime, Db, Manga } from "../../../types/types";

type ReturnType<T> = T extends Type.ANIME ? Anime[] : Manga[];

export const searchAdvanced = async <T extends Type.ANIME | Type.MANGA>(query: string, type: T, formats: Format[], page: number, perPage: number, genres: Genres[] = [], genresExcluded: Genres[] = [], year = 0, tags: string[] = [], tagsExcluded: string[] = [], sort: Sort = Sort.SCORE, sortDirection: SortDirection = SortDirection.ASC) => {
    if (dbType === "postgresql") {
        const skip = page > 0 ? perPage * (page - 1) : 0;
        let where;

        if (type === Type.ANIME) {
            where = Prisma.sql`
                WHERE
                (
                    ${"%" + query + "%"}        ILIKE ANY("anime".synonyms)
                    OR  ${"%" + query + "%"}    % ANY("anime".synonyms)
                    OR  "anime".title->>'english' ILIKE ${"%" + query + "%"}
                    OR  "anime".title->>'romaji'  ILIKE ${"%" + query + "%"}
                    OR  "anime".title->>'native'  ILIKE ${"%" + query + "%"}
                )
                ${
                    formats.length > 0
                        ? Prisma.sql`AND "anime"."format" IN (${Prisma.join(
                            formats.map((f) => Prisma.raw(`'${f}'`)),
                            ", "
                        )})`
                        : Prisma.empty
                }
                ${
                    genres && genres.length > 0
                        ? Prisma.sql`AND ARRAY[${Prisma.join(
                            genres.map((g) => Prisma.raw(`'${g}'`)),
                            ", "
                        )}] <@ "anime"."genres"`
                        : Prisma.empty
                }
                ${
                    genresExcluded.length > 0
                        ? Prisma.sql`AND NOT ARRAY[${Prisma.join(
                            genresExcluded.map((g) => Prisma.raw(`'${g}'`)),
                            ", "
                        )}] <@ "anime"."genres"`
                        : Prisma.empty
                }
                ${
                    tags && tags.length > 0
                        ? Prisma.sql`AND ARRAY[${Prisma.join(
                            tags.map((g) => Prisma.raw(`'${g}'`)),
                            ", "
                        )}] <@ "anime"."tags"`
                        : Prisma.empty
                }
                ${
                    tagsExcluded.length > 0
                        ? Prisma.sql`AND NOT ARRAY[${Prisma.join(
                            tagsExcluded.map((g) => Prisma.raw(`'${g}'`)),
                            ", "
                        )}] <@ "anime"."tags"`
                        : Prisma.empty
                }
                ${year > 0 ? Prisma.sql`AND "anime"."year" = ${year}` : Prisma.empty}
            `;
        } else {
            where = Prisma.sql`
                WHERE
                (
                    ${"%" + query + "%"}        ILIKE ANY("manga".synonyms)
                    OR  ${"%" + query + "%"}    % ANY("manga".synonyms)
                    OR  "manga".title->>'english' ILIKE ${"%" + query + "%"}
                    OR  "manga".title->>'romaji'  ILIKE ${"%" + query + "%"}
                    OR  "manga".title->>'native'  ILIKE ${"%" + query + "%"}
                )
                ${
                    formats.length > 0
                        ? Prisma.sql`AND "manga"."format" IN (${Prisma.join(
                            formats.map((f) => Prisma.raw(`'${f}'`)),
                            ", "
                        )})`
                        : Prisma.empty
                }
                ${
                    genres && genres.length > 0
                        ? Prisma.sql`AND ARRAY[${Prisma.join(
                            genres.map((g) => Prisma.raw(`'${g}'`)),
                            ", "
                        )}] <@ "manga"."genres"`
                        : Prisma.empty
                }
                ${
                    genresExcluded.length > 0
                        ? Prisma.sql`AND NOT ARRAY[${Prisma.join(
                            genresExcluded.map((g) => Prisma.raw(`'${g}'`)),
                            ", "
                        )}] <@ "manga"."genres"`
                        : Prisma.empty
                }
                ${
                    tags && tags.length > 0
                        ? Prisma.sql`AND ARRAY[${Prisma.join(
                            tags.map((g) => Prisma.raw(`'${g}'`)),
                            ", "
                        )}] <@ "manga"."tags"`
                        : Prisma.empty
                }
                ${
                    tagsExcluded.length > 0
                        ? Prisma.sql`AND NOT ARRAY[${Prisma.join(
                            tagsExcluded.map((g) => Prisma.raw(`'${g}'`)),
                            ", "
                        )}] <@ "manga"."tags"`
                        : Prisma.empty
                }
                ${year > 0 ? Prisma.sql`AND "manga"."year" = ${year}` : Prisma.empty}
            `;
        }

        let [count, results] = [0, []];
        if (type === Type.ANIME) {
            [count, results] = await prisma.$transaction([
                prisma.$queryRaw`
                        SELECT COUNT(*) FROM "anime"
                        ${where}
                    `,
                prisma.$queryRaw`
                        SELECT * FROM "anime"
                        ${where}
                        ORDER BY
                            (CASE WHEN "anime".title->>'english' IS NOT NULL THEN similarity(LOWER("anime".title->>'english'), LOWER(${query})) ELSE 0 END,
                            + CASE WHEN "anime".title->>'romaji' IS NOT NULL THEN similarity(LOWER("anime".title->>'romaji'), LOWER(${query})) ELSE 0 END,
                            + CASE WHEN "anime".title->>'native' IS NOT NULL THEN similarity(LOWER("anime".title->>'native'), LOWER(${query})) ELSE 0 END,
                            + CASE WHEN synonyms IS NOT NULL THEN most_similar(LOWER(${query}), synonyms) ELSE 0 END)
                                DESC
                        LIMIT    ${perPage}
                        OFFSET   ${skip}
                    `,
            ]);
        } else {
            [count, results] = await prisma.$transaction([
                prisma.$queryRaw`
                        SELECT COUNT(*) FROM "manga"
                        ${where}
                    `,
                prisma.$queryRaw`
                        SELECT * FROM "manga"
                        ${where}
                        ORDER BY
                            (CASE WHEN "manga".title->>'english' IS NOT NULL THEN similarity(LOWER("manga".title->>'english'), LOWER(${query})) ELSE 0 END,
                            + CASE WHEN "manga".title->>'romaji' IS NOT NULL THEN similarity(LOWER("manga".title->>'romaji'), LOWER(${query})) ELSE 0 END,
                            + CASE WHEN "manga".title->>'native' IS NOT NULL THEN similarity(LOWER("manga".title->>'native'), LOWER(${query})) ELSE 0 END,
                            + CASE WHEN synonyms IS NOT NULL THEN most_similar(LOWER(${query}), synonyms) ELSE 0 END)
                                DESC
                        LIMIT    ${perPage}
                        OFFSET   ${skip}
                    `,
            ]);
        }

        const total = Number((count as any)[0].count ?? 0);
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
