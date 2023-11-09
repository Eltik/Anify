import { cacheTime, redis } from "..";
import { env } from "../../env";
import { createResponse } from "../lib/response";

export const handler = async (req: Request): Promise<Response> => {
    try {
        const url = new URL(req.url);
        const paths = url.pathname.split("/");
        paths.shift();

        const body =
            req.method === "POST"
                ? ((await req.json().catch(() => {
                      return null;
                  })) as Body)
                : null;

        const id = body?.id ?? paths[1] ?? url.searchParams.get("id") ?? null;
        if (!id) {
            return createResponse(JSON.stringify({ error: "No MixDrop ID provided." }), 400);
        }

        if (!env.USE_MIXDROP || !env.MIXDROP_EMAIL || !env.MIXDROP_KEY) {
            return createResponse(JSON.stringify({ error: "MixDrop is not enabled." }), 400);
        }

        const cached = await redis.get(`mixdrop:${id}`);
        if (cached) {
            return createResponse(cached);
        }

        const data = await (await fetch(`https://api.mixdrop.ag/fileinfo2?email=${env.MIXDROP_EMAIL}&key=${env.MIXDROP_KEY}&ref[]=${id}`)).json();

        await redis.set(`mixdrop:${id}`, JSON.stringify(data), "EX", cacheTime);

        return createResponse(JSON.stringify(data));
    } catch (e) {
        console.error(e);
        return createResponse(JSON.stringify({ error: "An error occurred." }), 500);
    }
};

const route = {
    path: "/mixdrop",
    handler,
    rateLimit: 75,
};

type Body = {
    id: string;
};

export default route;
