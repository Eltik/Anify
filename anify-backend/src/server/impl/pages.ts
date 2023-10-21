import { cacheTime, redis } from "..";
import content from "../../content";
import { Chapter, Page } from "../../types/types";
import queues from "../../worker";

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
            return new Response(JSON.stringify({ error: "No media ID provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Max-Age": "2592000", "Access-Control-Allow-Headers": "*" },
            });
        }

        const chapterNumber = Number(body?.chapterNumber ?? paths[2] ?? url.searchParams.get("chapterNumber") ?? null);
        if (!chapterNumber) {
            return new Response(JSON.stringify({ error: "No chapter number provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Max-Age": "2592000", "Access-Control-Allow-Headers": "*" },
            });
        }

        const providerId = body?.providerId ?? paths[3] ?? url.searchParams.get("providerId") ?? null;
        if (!providerId) {
            return new Response(JSON.stringify({ error: "No provider ID provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Max-Age": "2592000", "Access-Control-Allow-Headers": "*" },
            });
        }

        const readId = decodeURIComponent(body?.readId ?? paths[4] ?? url.searchParams.get("readId") ?? "");
        if (!readId || readId.length === 0) {
            return new Response(JSON.stringify({ error: "No read ID provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Max-Age": "2592000", "Access-Control-Allow-Headers": "*" },
            });
        }

        const cached = await redis.get(`pages:${id}:${chapterNumber}:${providerId}:${readId}`);
        if (cached) {
            return new Response(cached, {
                status: 200,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Max-Age": "2592000", "Access-Control-Allow-Headers": "*" },
            });
        }

        const data = await content.fetchPages(providerId, readId);

        await redis.set(`pages:${id}:${chapterNumber}:${providerId}:${readId}`, JSON.stringify(data), "EX", cacheTime);

        const chapter: Chapter | null = {
            id: readId,
            number: chapterNumber,
            title: "",
            rating: 0,
        };

        if (chapter) await queues.uploadManga.add({ id, providerId, chapter, pages: (data as Page[]) ?? [] });

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Max-Age": "2592000", "Access-Control-Allow-Headers": "*" },
        });
    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: "An error occurred." }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Max-Age": "2592000", "Access-Control-Allow-Headers": "*" },
        });
    }
};

const route = {
    path: "/pages",
    handler,
    rateLimit: 60,
};

export default route;
