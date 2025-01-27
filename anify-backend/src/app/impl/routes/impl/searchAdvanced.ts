import { redis } from "../../..";
import { db } from "../../../../database";
import { env } from "../../../../env";
import middleware from "../../middleware";
import type { MediaFormat, MediaSeason } from "../../../../types";

const handler = async (req: Request): Promise<Response> => {
    try {
        const url = new URL(req.url);
        const paths = url.pathname.split("/");
        paths.shift();

        const body =
            req.method === "POST"
                ? ((await req.json().catch(() => {
                      return null;
                  })) as Body)
                : null;

        const validTypes = ["anime", "manga"];

        const type = body?.type ?? url.searchParams.get("type") ?? null;
        if (!type) {
            return middleware.createResponse(JSON.stringify({ error: "No type provided." }), 400);
        }
        if (!validTypes.includes(type.toLowerCase())) {
            return middleware.createResponse(JSON.stringify({ error: "Invalid type provided." }), 400);
        }

        const query = body?.query ?? url.searchParams.get("query") ?? "";
        const formats = body?.formats ?? url.searchParams.get("formats")?.split(",") ?? [];
        const genres = body?.genres ?? url.searchParams.get("genres")?.split(",") ?? [];
        const genresExcluded = body?.genresExcluded ?? url.searchParams.get("genresExcluded")?.split(",") ?? [];
        const tags = body?.tags ?? url.searchParams.get("tags")?.split(",") ?? [];
        const tagsExcluded = body?.tagsExcluded ?? url.searchParams.get("tagsExcluded")?.split(",") ?? [];
        const season = body?.season ?? url.searchParams.get("season") ?? null;
        const year = Number(body?.year ?? url.searchParams.get("year") ?? "0");
        const page = Number(body?.page ?? url.searchParams.get("page") ?? "1");
        const perPage = Number(body?.perPage ?? url.searchParams.get("perPage") ?? "20");
        const sortField = body?.sort ?? url.searchParams.get("sort") ?? "title";
        const sortOrder = (body?.sortDirection ?? url.searchParams.get("sortDirection") ?? "ASC").toUpperCase();

        const cacheKey = `search-advanced:${type}:${query}:${JSON.stringify(formats)}:${genres}:${genresExcluded}:${tags}:${tagsExcluded}:${season}:${year}:${page}:${perPage}:${sortField}:${sortOrder}`;

        const cached = await redis.get(cacheKey);
        if (cached) {
            return middleware.createResponse(cached);
        }

        const searchQuery = `
            WITH filtered_media AS (
                SELECT *, 
                    CASE 
                        WHEN title->>'english' ILIKE $1 THEN 1
                        WHEN title->>'romaji' ILIKE $1 THEN 2
                        WHEN title->>'native' ILIKE $1 THEN 3
                        ELSE 4
                    END as title_match_rank
                FROM anify.${type.toLowerCase()}
                WHERE ($1 = '' OR 
                    title->>'english' ILIKE $1 OR
                    title->>'romaji' ILIKE $1 OR
                    title->>'native' ILIKE $1 OR
                    EXISTS (
                        SELECT 1 
                        FROM unnest(synonyms) synonym 
                        WHERE synonym ILIKE $1
                    )
                )
                ${formats.length ? "AND format = ANY($2::text[])" : ""}
                ${genres.length ? "AND genres && $3::text[]" : ""}
                ${genresExcluded.length ? "AND NOT (genres && $4::text[])" : ""}
                ${tags.length ? "AND tags && $5::text[]" : ""}
                ${tagsExcluded.length ? "AND NOT (tags && $6::text[])" : ""}
                ${season ? "AND season = $7" : ""}
                ${year ? "AND year = $8" : ""}
            ),
            count_total AS (
                SELECT COUNT(*) as total
                FROM filtered_media
            )
            SELECT 
                fm.*,
                ct.total as total_count
            FROM filtered_media fm, count_total ct
            ORDER BY 
                CASE WHEN $9 = 'title' THEN
                    title_match_rank
                ELSE
                    0
                END,
                CASE 
                    WHEN $9 = 'title' THEN COALESCE(title->>'english', title->>'romaji', title->>'native')
                    WHEN $9 = 'popularity' THEN COALESCE((popularity->>'mal')::float, 0)
                    WHEN $9 = 'averageRating' THEN COALESCE(averageRating, 0)
                    WHEN $9 = 'year' THEN COALESCE(year, 0)
                    ELSE COALESCE(title->>'english', title->>'romaji', title->>'native')
                END ${sortOrder === "DESC" ? "DESC" : "ASC"}
            LIMIT $10 OFFSET $11;
        `;

        const params = [`%${query}%`, formats, genres, genresExcluded, tags, tagsExcluded, season, year, sortField, perPage, (page - 1) * perPage].filter((p) => p !== null && (Array.isArray(p) ? p.length > 0 : true));

        const result = await db.query(searchQuery, params);

        const totalCount = result.rows[0]?.total_count ?? 0;
        const totalPages = Math.ceil(totalCount / perPage);

        const data = {
            results: result.rows.map((row: { total_count: number; title_match_rank: number; [key: string]: unknown }) => {
                // eslint-disable-next-line @typescript-eslint/no-unused-vars
                const { total_count, title_match_rank, ...rest } = row;
                return rest;
            }),
            currentPage: page,
            totalPages,
            hasNextPage: page < totalPages,
            totalResults: totalCount,
        };

        await redis.set(cacheKey, JSON.stringify(data), "EX", env.REDIS_CACHE_TIME);

        return middleware.createResponse(JSON.stringify(data));
    } catch (e) {
        console.error(e);
        return middleware.createResponse(JSON.stringify({ error: "An error occurred." }), 500);
    }
};

const route = {
    path: "/search-advanced",
    handler,
    rateLimit: 30,
};

type Body = {
    type: string;
    query?: string;
    formats?: MediaFormat[];
    genres?: string[];
    genresExcluded?: string[];
    tags?: string[];
    tagsExcluded?: string[];
    season?: MediaSeason;
    year?: number;
    page?: number;
    perPage?: number;
    sort?: string;
    sortDirection?: string;
};

export default route;
