import { redis } from "../../..";
import { db } from "../../../../database";
import { env } from "../../../../env";
import middleware from "../../middleware";

const handler = async (req: Request): Promise<Response> => {
    try {
        const url = new URL(req.url);
        const query = url.searchParams.get("query");
        const page = Number.parseInt(url.searchParams.get("page") ?? "1");
        const perPage = Number.parseInt(url.searchParams.get("perPage") ?? "25");

        if (!query) {
            return middleware.createResponse(JSON.stringify({ error: "No query provided." }), 400);
        }

        const cached = await redis.get(`search:${query}:${page}`);
        if (cached) {
            return middleware.createResponse(cached);
        }

        const countQuery = `
            SELECT COUNT(*) as total FROM (
                SELECT 1 FROM anify.anime 
                WHERE 
                    title->>'english' ILIKE $1 OR
                    title->>'romaji' ILIKE $1 OR
                    title->>'native' ILIKE $1 OR
                    EXISTS (
                        SELECT 1 
                        FROM unnest(synonyms) synonym 
                        WHERE synonym ILIKE $1
                    )
                UNION
                SELECT 1 FROM anify.manga
                WHERE 
                    title->>'english' ILIKE $1 OR
                    title->>'romaji' ILIKE $1 OR
                    title->>'native' ILIKE $1 OR
                    EXISTS (
                        SELECT 1 
                        FROM unnest(synonyms) synonym 
                        WHERE synonym ILIKE $1
                    )
            ) as count;
        `;

        const totalCount = (await db.query(countQuery, [`%${query}%`])).rows[0].total;
        const totalPages = Math.ceil(totalCount / perPage);
        const offset = (page - 1) * perPage;

        const searchQuery = `
            SELECT * FROM anify.anime 
            WHERE 
                title->>'english' ILIKE $1 OR
                title->>'romaji' ILIKE $1 OR
                title->>'native' ILIKE $1 OR
                EXISTS (
                    SELECT 1 
                    FROM unnest(synonyms) synonym 
                    WHERE synonym ILIKE $1
                )
            UNION
            SELECT * FROM anify.manga
            WHERE 
                title->>'english' ILIKE $1 OR
                title->>'romaji' ILIKE $1 OR
                title->>'native' ILIKE $1 OR
                EXISTS (
                    SELECT 1 
                    FROM unnest(synonyms) synonym 
                    WHERE synonym ILIKE $1
                )
            ORDER BY 
                CASE 
                    WHEN title->>'english' ILIKE $1 THEN 1
                    WHEN title->>'romaji' ILIKE $1 THEN 2
                    WHEN title->>'native' ILIKE $1 THEN 3
                    ELSE 4
                END,
                popularity->>'mal' DESC NULLS LAST,
                averagePopularity DESC NULLS LAST
            LIMIT $2 OFFSET $3;
        `;

        const result = await db.query(searchQuery, [`%${query}%`, perPage, offset]);
        const data = {
            results: result.rows,
            currentPage: page,
            totalPages: totalPages,
            hasNextPage: page < totalPages,
            totalResults: totalCount,
        };

        await redis.set(`search:${query}:${page}`, JSON.stringify(data), "EX", env.REDIS_CACHE_TIME);

        return middleware.createResponse(JSON.stringify(data));
    } catch (e) {
        console.error(e);
        return middleware.createResponse(JSON.stringify({ error: "An error occurred." }), 500);
    }
};

const route = {
    path: "/search",
    handler,
    rateLimit: 50,
};

export default route;
