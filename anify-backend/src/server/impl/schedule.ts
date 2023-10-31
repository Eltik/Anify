import { cacheTime, redis } from "..";
import { loadSchedule } from "../../lib/impl/schedule";
import { Type } from "../../types/enums";
import { createResponse } from "../lib/response";

export const handler = async (req: Request): Promise<Response> => {
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

        const type = body?.type ?? paths[1] ?? url.searchParams.get("type") ?? "anime";
        if (!validTypes.includes(type.toLowerCase())) {
            return createResponse(JSON.stringify({ error: "Invalid type provided." }), 400);
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

        const cached = await redis.get(`schedule:${type}:${JSON.stringify(fields)}`);
        if (cached) {
            return new Response(cached, {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Max-Age": "2592000",
                    "Access-Control-Allow-Headers": "*",
                },
            });
        }

        const data = await loadSchedule({ type: type.toUpperCase() as Type, fields });

        await redis.set(`schedule:${type}:${JSON.stringify(fields)}`, JSON.stringify(data), "EX", cacheTime);

        return createResponse(JSON.stringify(data), 200);
    } catch (e) {
        console.error(e);
        return createResponse(JSON.stringify({ error: "An error occurred." }), 500);
    }
};

const route = {
    path: "/schedule",
    handler,
    rateLimit: 60,
};

type Body = {
    type: string;
    fields?: string[];
};

export default route;
