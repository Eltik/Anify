import { cacheTime, redis } from "..";
import content from "../../content";
import { isBanned } from "../../helper/banned";
import { StreamingServers, SubType } from "../../types/enums";
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

        const episodeNumber = Number(body?.episodeNumber ?? paths[2] ?? url.searchParams.get("episodeNumber") ?? null);
        if (!episodeNumber) {
            return createResponse(JSON.stringify({ error: "No episode number provided." }), 400);
        }

        const providerId = body?.providerId ?? paths[3] ?? url.searchParams.get("providerId") ?? null;
        if (!providerId) {
            return createResponse(JSON.stringify({ error: "No provider ID provided." }), 400);
        }

        const watchId = decodeURIComponent(body?.watchId ?? paths[4] ?? url.searchParams.get("watchId") ?? "");
        if (!watchId || watchId.length === 0) {
            return createResponse(JSON.stringify({ error: "No watch ID provided." }), 400);
        }

        const subType = decodeURIComponent(body?.subType ?? paths[5] ?? url.searchParams.get("subType") ?? "");
        if (!subType || subType.length === 0) {
            return createResponse(JSON.stringify({ error: "No sub type provided." }), 400);
        } else if (!["SUB", "DUB"].includes(subType.toUpperCase())) {
            return createResponse(JSON.stringify({ error: "Sub type is invalid." }), 400);
        }

        const server = body?.server ?? paths[6] ?? url.searchParams.get("server") ?? undefined ? (decodeURIComponent(body?.server ?? paths[6] ?? url.searchParams.get("server") ?? undefined) as StreamingServers) : undefined;

        const cached = await redis.get(`sources:${id}:${episodeNumber}:${providerId}:${watchId}:${subType}:${server}`);
        if (cached) {
            return createResponse(cached);
        }

        const banned = await isBanned(id);
        if (banned) return createResponse(JSON.stringify({ error: "This item is banned." }), 403);

        const data = await content.fetchSources(providerId, watchId, subType as SubType, server as StreamingServers);
        if (!data) return createResponse(JSON.stringify({ error: "Sources not found." }), 404);

        if (data) queues.skipTimes.add({ id, episode: episodeNumber, toInsert: data });

        await redis.set(`sources:${id}:${episodeNumber}:${providerId}:${watchId}:${subType}:${server}`, JSON.stringify(data), "EX", cacheTime);

        return createResponse(JSON.stringify(data));
    } catch (e) {
        console.error(e);
        return createResponse(JSON.stringify({ error: "An error occurred." }), 500);
    }
};
const route = {
    method: "GET",
    path: "/sources",
    handler,
    rateLimit: 60,
};

type Body = {
    providerId: string;
    id: string;
    episodeNumber: string;
    watchId: string;
    subType: string;
    server?: string;
};

export default route;
