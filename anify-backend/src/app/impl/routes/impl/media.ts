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

        const providerId = body?.providerId ?? paths[1] ?? url.searchParams.get("providerId") ?? null;
        if (!providerId) {
            return middleware.createResponse(JSON.stringify({ error: "No provider ID provided." }), 400);
        }

        const id = body?.id ?? paths[2] ?? url.searchParams.get("id") ?? null;
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

        const cached = await redis.get(`media:${providerId}:${id}:${JSON.stringify(fields)}`);
        if (cached) {
            return middleware.createResponse(cached);
        }

        const mediaQuery = `
            WITH media_union AS (
                SELECT *, 'ANIME' as mediaType FROM anify.anime
                WHERE EXISTS (
                    SELECT 1 FROM jsonb_array_elements(mappings) as m
                    WHERE m->>'providerId' = $1 AND m->>'id' = $2
                )
                UNION ALL
                SELECT *, 'MANGA' as mediaType FROM anify.manga
                WHERE EXISTS (
                    SELECT 1 FROM jsonb_array_elements(mappings) as m
                    WHERE m->>'providerId' = $1 AND m->>'id' = $2
                )
            )
            SELECT 
                ${fields.length ? fields.map((f) => `"${f}"`).join(", ") : "*"},
                mediaType as type
            FROM media_union
            LIMIT 1;
        `;

        const result = await db.query(mediaQuery, [providerId, id]);

        if (!result.rows.length) {
            return middleware.createResponse(JSON.stringify({ error: "No data found." }), 404);
        }

        const data = result.rows[0];

        await redis.set(`media:${providerId}:${id}:${JSON.stringify(fields)}`, JSON.stringify(data), "EX", env.REDIS_CACHE_TIME);

        return middleware.createResponse(JSON.stringify(data));
    } catch (e) {
        console.error(e);
        return middleware.createResponse(JSON.stringify({ error: "An error occurred." }), 500);
    }
};

const route = {
    path: "/media",
    handler,
    rateLimit: 75,
};

type Body = {
    providerId: string;
    id: string;
    fields?: string[];
};

export default route;
