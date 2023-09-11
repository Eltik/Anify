import { cacheTime, redis } from "..";
import { get } from "../../database/impl/modify/get";
import { Anime, Manga } from "../../types/types";

export const handler = async (req: Request): Promise<Response> => {
    try {
        const url = new URL(req.url);
        const paths = url.pathname.split("/");
        paths.shift();

        const body =
            req.method === "POST"
                ? await req.json().catch(() => {
                      return null;
                  })
                : null;

        const id = body?.id ?? paths[1] ?? url.searchParams.get("id") ?? null;
        if (!id) {
            return new Response(JSON.stringify({ error: "No ID provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const cached = await redis.get(`relations:${id}`);
        if (cached) {
            return new Response(cached, {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        const data = await get(String(id));
        if (!data) {
            return new Response(JSON.stringify({ error: "No data found." }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }

        const relations: Anime[] | Manga[] = [];
        for (const relation of data.relations) {
            const possible = await get(String(relation.id));
            if (possible) {
                Object.assign(possible, { relationType: relation.type });
                relations.push(possible as any);
            }
        }

        await redis.set(`relations:${id}`, JSON.stringify(relations), "EX", cacheTime);

        return new Response(JSON.stringify(relations), {
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
    path: "/relations",
    handler,
};

export default route;
