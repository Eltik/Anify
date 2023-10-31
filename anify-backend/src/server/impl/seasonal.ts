import { Format, Type } from "../../types/enums";
import { loadSeasonal } from "../../lib/impl/seasonal";
import { seasonal } from "../../database/impl/fetch/seasonal";
import { cacheTime, redis } from "..";
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

        const type = body?.type ?? paths[1] ?? url.searchParams.get("type") ?? null;
        if (!type) {
            return createResponse(JSON.stringify({ error: "No type provided." }), 400);
        } else if (!validTypes.includes(type.toLowerCase())) {
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

        const cached = await redis.get(`seasonal:${type}:${fields.join(",")}`);
        if (cached) {
            return createResponse(cached);
        }

        const formats = type.toLowerCase() === "anime" ? [Format.MOVIE, Format.TV, Format.TV_SHORT, Format.OVA, Format.ONA, Format.OVA] : type.toLowerCase() === "manga" ? [Format.MANGA, Format.ONE_SHOT] : [Format.NOVEL];

        const seasonData = await loadSeasonal({
            type: (type.toLowerCase() === "novel" ? Type.MANGA : type.toUpperCase()) as Type,
            formats,
        });
        const data = await seasonal(seasonData?.trending ?? [], seasonData?.popular ?? [], seasonData?.top ?? [], seasonData?.seasonal ?? [], fields);

        await redis.set(`seasonal:${type}:${fields.join(",")}`, JSON.stringify(data), "EX", cacheTime);

        return createResponse(JSON.stringify(data));
    } catch (e) {
        console.error(e);
        return createResponse(JSON.stringify({ error: "An error occurred." }), 500);
    }
};

const route = {
    path: "/seasonal",
    handler,
    rateLimit: 35,
};

type Body = {
    type: string;
    fields?: string[];
};

export default route;
