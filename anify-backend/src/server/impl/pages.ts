import { cacheTime, redis } from "..";
import content from "../../content";
import { isBanned } from "../../helper/banned";
import { Chapter, Page } from "../../types/types";
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
            return createResponse(JSON.stringify({ error: "No media ID provided." }), 400);
        }

        const chapterNumber = Number(body?.chapterNumber ?? paths[2] ?? url.searchParams.get("chapterNumber") ?? null);
        if (!chapterNumber) {
            return createResponse(JSON.stringify({ error: "No chapter number provided." }), 400);
        }

        const providerId = body?.providerId ?? paths[3] ?? url.searchParams.get("providerId") ?? null;
        if (!providerId) {
            return createResponse(JSON.stringify({ error: "No provider ID provided." }), 400);
        }

        const readId = decodeURIComponent(body?.readId ?? paths[4] ?? url.searchParams.get("readId") ?? "");
        if (!readId || readId.length === 0) {
            return createResponse(JSON.stringify({ error: "No read ID provided." }), 400);
        }

        const cached = await redis.get(`pages:${id}:${chapterNumber}:${providerId}:${readId}`);
        if (cached) {
            return createResponse(cached);
        }

        const banned = await isBanned(id);
        if (banned) return createResponse(JSON.stringify({ error: "This item is banned." }), 403);

        const data = await content.fetchPages(providerId, readId);

        await redis.set(`pages:${id}:${chapterNumber}:${providerId}:${readId}`, JSON.stringify(data), "EX", cacheTime);

        const chapter: Chapter | null = {
            id: readId,
            number: chapterNumber,
            title: "",
            rating: 0,
        };

        if (chapter) await queues.uploadManga.add({ id, providerId, chapter, pages: (data as Page[]) ?? [] });

        return createResponse(JSON.stringify(data), 200);
    } catch (e) {
        console.error(e);
        return createResponse(JSON.stringify({ error: "An error occurred." }), 500);
    }
};

const route = {
    path: "/pages",
    handler,
    rateLimit: 60,
};

type Body = {
    providerId: string;
    id: string;
    chapterNumber: string;
    readId: string;
};

export default route;
