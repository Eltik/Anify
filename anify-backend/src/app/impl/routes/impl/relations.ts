import { redis } from "../../..";
import { db } from "../../../../database";
import { env } from "../../../../env";
import middleware from "../../middleware";

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

        const id = body?.id ?? paths[1] ?? url.searchParams.get("id") ?? null;
        if (!id) {
            return middleware.createResponse(JSON.stringify({ error: "No ID provided." }), 400);
        }

        let fields: string[] = body?.fields ?? [];
        const fieldsParam = url.searchParams.get("fields");

        if (fieldsParam?.startsWith("[") && fieldsParam.endsWith("]")) {
            const fieldsArray = fieldsParam
                .slice(1, -1)
                .split(",")
                .map((field) => field.trim());
            fields = fields.concat(fieldsArray.filter(Boolean));
        }

        const cached = await redis.get(`relations:${id}:${JSON.stringify(fields)}`);
        if (cached) {
            return middleware.createResponse(cached);
        }

        const mediaQuery = `
            SELECT * FROM anify.anime WHERE id = $1
            UNION ALL
            SELECT * FROM anify.manga WHERE id = $1
            LIMIT 1;
        `;
        
        const media = await db.query(mediaQuery, [id]);
        if (!media.rows.length) {
            return middleware.createResponse(JSON.stringify({ error: "No data found." }), 404);
        }

        const relationsQuery = `
            WITH RECURSIVE relation_tree AS (
                -- Base case: direct relations
                SELECT 
                    r.*,
                    1 as depth,
                    ARRAY[r.id] as path
                FROM (
                    SELECT DISTINCT jsonb_array_elements(relations) as relation
                    FROM (
                        SELECT relations FROM anify.anime WHERE id = $1
                        UNION ALL
                        SELECT relations FROM anify.manga WHERE id = $1
                    ) base
                ) sub
                CROSS JOIN LATERAL jsonb_to_record(sub.relation) as r(
                    id text,
                    type text,
                    format text,
                    relationType text,
                    title jsonb
                )
                
                UNION ALL
                
                -- Recursive case: relations of relations
                SELECT 
                    r.*,
                    rt.depth + 1,
                    rt.path || r.id
                FROM relation_tree rt
                CROSS JOIN LATERAL (
                    SELECT DISTINCT jsonb_array_elements(relations) as relation
                    FROM (
                        SELECT relations FROM anify.anime WHERE id = rt.id
                        UNION ALL
                        SELECT relations FROM anify.manga WHERE id = rt.id
                    ) base
                ) sub
                CROSS JOIN LATERAL jsonb_to_record(sub.relation) as r(
                    id text,
                    type text,
                    format text,
                    relationType text,
                    title jsonb
                )
                WHERE 
                    r.id <> ALL(rt.path) AND
                    rt.depth < 3
            )
            SELECT 
                DISTINCT ON (id) *,
                CASE WHEN a.id IS NOT NULL THEN 'ANIME' ELSE 'MANGA' END as mediaType
            FROM relation_tree rt
            LEFT JOIN anify.anime a ON rt.id = a.id
            LEFT JOIN anify.manga m ON rt.id = m.id
            ${fields.length ? `WHERE ${fields.map(f => `relationType = '${f}'`).join(" OR ")}` : ""}
            ORDER BY id, depth;
        `;

        const relations = await db.query(relationsQuery, [id]);
        
        const result = (relations.rows as { id: string; mediatype: string; format: string; relationtype: string; title: string }[]).map(row => ({
            id: row.id,
            type: row.mediatype,
            format: row.format,
            relationType: row.relationtype,
            title: row.title
        }));

        await redis.set(
            `relations:${id}:${JSON.stringify(fields)}`, 
            JSON.stringify(result), 
            "EX", 
            env.REDIS_CACHE_TIME
        );

        return middleware.createResponse(JSON.stringify(result));
    } catch (e) {
        console.error(e);
        return middleware.createResponse(JSON.stringify({ error: "An error occurred." }), 500);
    }
};

const route = {
    path: "/relations",
    handler,
    rateLimit: 60,
};

type Body = {
    id: string;
    fields?: string[];
};

export default route; 