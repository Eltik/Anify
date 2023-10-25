import { Format, Type } from "../../types/enums";
import { recent } from "../../database/impl/fetch/recent";
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
                ? await req.json().catch(() => {
                      return null;
                  })
                : null;

        const type = body?.type ?? paths[1] ?? url.searchParams.get("type") ?? null;
        if (!type) {
            return createResponse(JSON.stringify({ error: "No type provided." }), 400);
        } else if (!validTypes.includes(type.toLowerCase())) {
            return createResponse(JSON.stringify({ error: "Invalid type provided." }), 400);
        }

        const page = body?.page ?? paths[2] ?? url.searchParams.get("page") ?? 0;
        const perPage = body?.perPage ?? paths[3] ?? url.searchParams.get("perPage") ?? 20;

        const cached = await redis.get(`recent:${type}:${page}:${perPage}`);
        if (cached) {
            return createResponse(cached);
        }

        const formats = type.toLowerCase() === "anime" ? [Format.MOVIE, Format.TV, Format.TV_SHORT, Format.OVA, Format.ONA, Format.OVA] : type.toLowerCase() === "manga" ? [Format.MANGA, Format.ONE_SHOT] : [Format.NOVEL];

        const data = await recent(type.toUpperCase() === "NOVEL" ? Type.MANGA : type.toUpperCase(), formats, page, perPage);

        await redis.set(`recent:${type}:${page}:${perPage}`, JSON.stringify(data), "EX", cacheTime);

        return createResponse(JSON.stringify(data));
    } catch (e) {
        console.error(e);
        return createResponse(JSON.stringify({ error: "An error occurred." }), 500);
    }
};

const route = {
    path: "/recent",
    handler,
    rateLimit: 60,
};

export default route;
