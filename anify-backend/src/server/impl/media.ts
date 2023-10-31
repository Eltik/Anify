import { cacheTime, redis } from "..";
import { media } from "../../database/impl/fetch/media";
import { createResponse } from "../lib/response";

export const handler = async (req: Request): Promise<Response> => {
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
            return createResponse(JSON.stringify({ error: "No provider ID provided." }), 400);
        }

        const id = body?.id ?? paths[2] ?? url.searchParams.get("id") ?? null;
        if (!id) {
            return createResponse(JSON.stringify({ error: "No ID provided." }), 400);
        }

        let fields: string[] = body?.fields ?? [];
        const fieldsParam = url.searchParams.get("fields");

        if (fieldsParam && fieldsParam.startsWith("[") && fieldsParam.endsWith("]")) {
            const fieldsArray = fieldsParam
                .slice(1, -1)
                .split(",")
                .map((field) => field.trim());
            fields = fieldsArray.filter(Boolean);
        }

        const cached = await redis.get(`media:${providerId}:${id}:${JSON.stringify(fields)}`);
        if (cached) {
            return createResponse(cached);
        }

        const data = await media(providerId, String(id), fields);
        if (!data) {
            return createResponse(JSON.stringify({ error: "No data found." }), 400);
        }

        await redis.set(`media:${providerId}:${id}:${JSON.stringify(fields)}`, JSON.stringify(data), "EX", cacheTime);

        return createResponse(JSON.stringify(data));
    } catch (e) {
        console.error(e);
        return createResponse(JSON.stringify({ error: "An error occurred." }), 500);
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
