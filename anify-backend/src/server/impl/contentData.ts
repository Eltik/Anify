import { cacheTime, redis } from "..";
import content from "../../content";
import { createResponse } from "../lib/response";

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
            return createResponse(JSON.stringify({ error: "No ID provided." }), 400);
        }

        const cached = await redis.get(`content-metadata:${id}`);
        if (cached) {
            return createResponse(cached);
        }

        const data = await content.fetchMetaData(String(id));

        await redis.set(`content-metadata:${id}`, JSON.stringify(data), "EX", cacheTime);

        return createResponse(JSON.stringify(data));
    } catch (e) {
        console.error(e);
        return createResponse(JSON.stringify({ error: "An error occurred." }), 500);
    }
};

const route = {
    path: "/content-metadata",
    handler,
    rateLimit: 50,
};

export default route;
