import { cacheTime, redis } from "..";
import { getSkipTimes } from "../../database/impl/skipTimes/getSkipTimes";
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
            return createResponse(JSON.stringify({ error: "No ID provided." }), 400);
        }

        const cached = await redis.get(`skip-times:${id}`);
        if (cached) {
            return createResponse(cached);
        }

        const data = await getSkipTimes(String(id));
        if (!data) {
            return createResponse(JSON.stringify({ error: "No data found." }), 404);
        }

        await redis.set(`skip-times:${id}`, JSON.stringify(data), "EX", cacheTime);

        return createResponse(JSON.stringify(data));
    } catch (e) {
        console.error(e);
        return createResponse(JSON.stringify({ error: "An error occurred." }), 500);
    }
};

const route = {
    path: "/skip-times",
    handler,
    rateLimit: 75,
};

type Body = {
    id: string;
};

export default route;
