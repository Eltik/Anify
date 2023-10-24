import { cacheTime, redis } from "..";
import { getSkipTimes } from "../../database/impl/skipTimes/getSkipTimes";

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

        const cached = await redis.get(`skip-times:${id}`);
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

        const data = await getSkipTimes(String(id));
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

        await redis.set(`skip-times:${id}`, JSON.stringify(data), "EX", cacheTime);

        return new Response(JSON.stringify(data), {
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
    path: "/skip-times",
    handler,
    rateLimit: 75,
};

export default route;
