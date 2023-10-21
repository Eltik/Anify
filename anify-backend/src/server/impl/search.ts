import queues from "../../worker";
import { search } from "../../database/impl/search/search";
import { Format, Type } from "../../types/enums";
import { cacheTime, redis } from "..";

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
            return new Response(JSON.stringify({ error: "No type provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Max-Age": "2592000", "Access-Allow-Control-Headers": "*" },
            });
        } else if (!validTypes.includes(type.toLowerCase())) {
            return new Response(JSON.stringify({ error: "Invalid type provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Max-Age": "2592000", "Access-Allow-Control-Headers": "*" },
            });
        }

        const query = decodeURIComponent(body?.query ?? paths[2] ?? url.searchParams.get("query") ?? "");
        if (!query || query.length === 0) {
            return new Response(JSON.stringify({ error: "No query provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Max-Age": "2592000", "Access-Allow-Control-Headers": "*" },
            });
        }

        const page = Number(body?.page ?? paths[3] ?? url.searchParams.get("page") ?? "1");
        const perPage = Number(body?.perPage ?? paths[4] ?? url.searchParams.get("perPage") ?? "20");

        const cached = await redis.get(`search:${type}:${query}:${page}:${perPage}`);
        if (cached) {
            return new Response(cached, {
                status: 200,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Max-Age": "2592000", "Access-Allow-Control-Headers": "*" },
            });
        }

        const formats = type.toLowerCase() === "anime" ? [Format.MOVIE, Format.TV, Format.TV_SHORT, Format.OVA, Format.ONA, Format.OVA] : type.toLowerCase() === "manga" ? [Format.MANGA, Format.ONE_SHOT] : [Format.NOVEL];

        const data = await search(query, (type.toUpperCase() === "NOVEL" ? Type.MANGA : type.toUpperCase()) as Type, formats, page, perPage);
        if (data.length === 0) {
            queues.searchQueue.add({ type: (type.toUpperCase() === "NOVEL" ? Type.MANGA : type.toUpperCase()) as Type, query: query, formats: formats });
        }

        await redis.set(`search:${type}:${query}:${page}:${perPage}`, JSON.stringify(data), "EX", cacheTime);

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Max-Age": "2592000", "Access-Allow-Control-Headers": "*" },
        });
    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: "An error occurred." }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Max-Age": "2592000", "Access-Allow-Control-Headers": "*" },
        });
    }
};

const route = {
    path: "/search",
    handler,
    rateLimit: 30,
};

export default route;
