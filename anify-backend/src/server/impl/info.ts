import { cacheTime, redis } from "..";
import { get } from "../../database/impl/modify/get";

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

        const cached = await redis.get(`info:${id}`);
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

        await redis.set(`info:${id}`, JSON.stringify(data), "EX", cacheTime);

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
    path: "/info",
    handler,
};

export default route;
