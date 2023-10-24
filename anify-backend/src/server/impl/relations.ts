import { cacheTime, redis } from "..";
import { get } from "../../database/impl/fetch/get";
import { relations } from "../../database/impl/fetch/relations";

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
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Max-Age": "2592000",
                    "Access-Control-Allow-Headers": "*",
                },
            });
        }

        const cached = await redis.get(`relations:${id}`);
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

        const data = await get(String(id));
        if (!data) {
            return new Response(JSON.stringify({ error: "No data found." }), {
                status: 404,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Max-Age": "2592000",
                    "Access-Control-Allow-Headers": "*",
                },
            });
        }

        const res = await relations(String(id));

        await redis.set(`relations:${id}`, JSON.stringify(res), "EX", cacheTime);

        return new Response(JSON.stringify(res), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Max-Age": "2592000",
                "Access-Control-Allow-Headers": "*",
            },
        });
    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: "An error occurred." }), {
            status: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Max-Age": "2592000",
                "Access-Control-Allow-Headers": "*",
            },
        });
    }
};

const route = {
    path: "/relations",
    handler,
    rateLimit: 60,
};

export default route;
