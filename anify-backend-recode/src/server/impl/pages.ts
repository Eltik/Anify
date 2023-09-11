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

        const chapterTitle = body.chapterTitle ?? paths[1] ?? url.searchParams.get("chapterTitle") ?? null;
        if (!chapterTitle) {
            return new Response(JSON.stringify({ error: "No chapter title provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const chapterNumber = Number(body.chapterNumber ?? paths[2] ?? url.searchParams.get("chapterNumber") ?? null);
        if (!chapterNumber) {
            return new Response(JSON.stringify({ error: "No chapter number provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const providerId = body?.providerId ?? paths[3] ?? url.searchParams.get("providerId") ?? null;
        if (!providerId) {
            return new Response(JSON.stringify({ error: "No provider ID provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const readId = decodeURIComponent(body?.readId ?? paths[4] ?? url.searchParams.get("readId") ?? "");
        if (!readId || readId.length === 0) {
            return new Response(JSON.stringify({ error: "No read ID provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const cached = await redis.get(`pages:${chapterTitle}:${chapterNumber}:${providerId}:${readId}`);
        if (cached) {
            return new Response(cached, {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        const data = await content.fetchPages(providerId, readId);

        await redis.set(`pages:${chapterTitle}:${chapterNumber}:${providerId}:${readId}`, JSON.stringify(data), "EX", cacheTime);

        const chapter: Chapter | null = {
            id: readId,
            number: chapterNumber,
            title: chapterTitle,
        };

        if (chapter) await queues.uploadPages.add({ providerId, chapter, pages: (data as Page[] | string) ?? [] });

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
    path: "/pages",
    handler,
};

export default route;
