import { cacheTime, redis } from "..";
import content from "../../content";
import { isBanned } from "../../helper/banned";
import queues from "../../worker";
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

        const cached = await redis.get(`chapters:${id}`);
        if (cached) {
            return createResponse(cached);
        }

        const banned = await isBanned(id);
        if (banned) return createResponse(JSON.stringify({ error: "This item is banned." }), 403);

        const data = await content.fetchChapters(String(id));

        // Check if the NovelUpdates provider exists
        const novelUpdates = data.find((chapter) => chapter.providerId === "novelupdates");
        if (novelUpdates) queues.uploadNovel.add({ id, providerId: "novelupdates", chapters: novelUpdates.chapters });

        await redis.set(`chapters:${id}`, JSON.stringify(data), "EX", cacheTime);

        return createResponse(JSON.stringify(data));
    } catch (e) {
        console.error(e);
        return createResponse(JSON.stringify({ error: "An error occurred." }), 500);
    }
};

const route = {
    path: "/chapters",
    handler,
    rateLimit: 40,
};

type Body = {
    id: string;
};

export default route;
