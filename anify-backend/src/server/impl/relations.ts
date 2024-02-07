import { cacheTime, redis } from "..";
import { get } from "../../database/impl/fetch/get";
import { relations } from "../../database/impl/fetch/relations";
import { isBanned } from "../../helper/banned";
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

        const id = body?.id ?? paths[1] ?? url.searchParams.get("id") ?? null;
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

        const cached = await redis.get(`relations:${id}:${JSON.stringify(fields)}`);
        if (cached) {
            return createResponse(cached);
        }

        const banned = await isBanned(id);
        if (banned) return createResponse(JSON.stringify({ error: "This item is banned." }), 403);

        const data = await get(String(id));
        if (!data) {
            return createResponse(JSON.stringify({ error: "No data found." }), 404);
        }

        const res = await relations(String(id), fields);

        await redis.set(`relations:${id}:${JSON.stringify(fields)}`, JSON.stringify(res), "EX", cacheTime);

        return createResponse(JSON.stringify(res));
    } catch (e) {
        console.error(e);
        return createResponse(JSON.stringify({ error: "An error occurred." }), 500);
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
