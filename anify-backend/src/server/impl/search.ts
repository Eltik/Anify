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
                headers: { "Content-Type": "application/json" },
            });
        } else if (!validTypes.includes(type.toLowerCase())) {
            return new Response(JSON.stringify({ error: "Invalid type provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const query = decodeURIComponent(body?.query ?? paths[2] ?? url.searchParams.get("query") ?? "");
        if (!query || query.length === 0) {
            return new Response(JSON.stringify({ error: "No query provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const cached = await redis.get(`search:${type}:${query}`);
        if (cached) {
            return new Response(cached, {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        const formats = type.toLowerCase() === "anime" ? [Format.MOVIE, Format.TV, Format.TV_SHORT, Format.OVA, Format.ONA, Format.OVA] : type.toLowerCase() === "manga" ? [Format.MANGA, Format.ONE_SHOT] : [Format.NOVEL];

        const data = await search(query, (type.toUpperCase() === "NOVEL" ? Type.MANGA : type.toUpperCase()) as Type, formats, 0, 20);
        if (data.length === 0) {
            queues.searchQueue.add({ type: (type.toUpperCase() === "NOVEL" ? Type.MANGA : type.toUpperCase()) as Type, query: query, formats: formats });
        }

        await redis.set(`search:${type}:${query}`, JSON.stringify(data), "EX", cacheTime);

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: "An error occurred." }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};

const route = {
    path: "/search",
    handler,
};

export default route;
