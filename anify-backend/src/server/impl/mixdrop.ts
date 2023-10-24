import { cacheTime, redis } from "..";
import { env } from "../../env";

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
            return new Response(JSON.stringify({ error: "No MixDrop ID provided." }), {
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

        if (!env.USE_MIXDROP || !env.MIXDROP_EMAIL || !env.MIXDROP_KEY) {
            return new Response(JSON.stringify({ error: "MixDrop is not enabled." }), {
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

        const cached = await redis.get(`mixdrop:${id}`);
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

        const data = await (await fetch(`https://api.mixdrop.co/fileinfo2?email=${env.MIXDROP_EMAIL}&key=${env.MIXDROP_KEY}&ref[]=${id}`)).json();

        await redis.set(`mixdrop:${id}`, JSON.stringify(data), "EX", cacheTime);

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
    path: "/mixdrop",
    handler,
    rateLimit: 75,
};

export default route;
