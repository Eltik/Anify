import { redis } from "../../..";
import { db } from "../../../../database";
import { MediaRepository } from "../../../../database/impl/wrapper/impl/media";
import { env } from "../../../../env";
import lib from "../../../../lib";
import { MediaFormat, MediaType } from "../../../../types";
import middleware from "../../middleware";

const handler = async (req: Request): Promise<Response> => {
    try {
        const url = new URL(req.url);
        const paths = url.pathname.split("/");
        paths.shift();

        const validTypes = ["anime", "manga", "novel"];

        const body =
            req.method === "POST"
                ? ((await req.json().catch(() => {
                      return null;
                  })) as Body)
                : null;

        const type = body?.type ?? paths[1] ?? url.searchParams.get("type") ?? null;
        if (!type) {
            return middleware.createResponse(JSON.stringify({ error: "No type provided." }), 400);
        }
        
        if (!validTypes.includes(type.toLowerCase())) {
            return middleware.createResponse(JSON.stringify({ error: "Invalid type provided." }), 400);
        }

        let fields: string[] = body?.fields ?? [];
        const fieldsParam = url.searchParams.get("fields");

        if (fieldsParam?.startsWith("[") && fieldsParam.endsWith("]")) {
            const fieldsArray = fieldsParam
                .slice(1, -1)
                .split(",")
                .map((field) => field.trim());
            fields = fieldsArray.filter(Boolean);
        }

        const cached = await redis.get(`seasonal:${type}:${fields.join(",")}`);
        if (cached) {
            return middleware.createResponse(cached);
        }

        const formats = type.toLowerCase() === "anime" ? [MediaFormat.MOVIE, MediaFormat.TV, MediaFormat.TV_SHORT, MediaFormat.OVA, MediaFormat.ONA, MediaFormat.OVA] : type.toLowerCase() === "manga" ? [MediaFormat.MANGA, MediaFormat.ONE_SHOT] : [MediaFormat.NOVEL];

        const data = await lib.loadSeasonal({
            type: (type.toLowerCase() === "novel" ? MediaType.MANGA : type.toUpperCase()) as MediaType,
            formats,
        });

        if (!data) {
            return middleware.createResponse(JSON.stringify({ error: "No data found." }), 404);
        }

        // Combine all arrays and create a Set to remove duplicates in one pass which is faster than filtering each array individually
        const uniqueItems = [...new Set([
            ...(data.trending || []),
            ...(data.seasonal || []),
            ...(data.popular || []),
            ...(data.top || [])
        ])].map(x => ({
            type: x.type,
            id: x.id,
            formats: [x.format]
        }));

        const batchData = await MediaRepository.batchFetchWithFilter(db, uniqueItems);

        if (batchData.length !== 0) {
            await redis.set(`seasonal:${type}:${fields.join(",")}`, JSON.stringify(batchData), "EX", env.REDIS_CACHE_TIME);
        }

        return middleware.createResponse(JSON.stringify(batchData));
    } catch (e) {
        console.error(e);
        return middleware.createResponse(JSON.stringify({ error: "An error occurred." }), 500);
    }
};

const route = {
    path: "/seasonal",
    handler,
    rateLimit: 60,
};

type Body = {
    type: string;
    fields?: string[];
};

export default route;
