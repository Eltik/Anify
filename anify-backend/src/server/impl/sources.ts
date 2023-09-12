import { cacheTime, redis } from "..";
import content from "../../content";
import { StreamingServers, SubType } from "../../types/enums";
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

        const id = body.id ?? paths[1] ?? url.searchParams.get("id") ?? null;
        if (!id) {
            return new Response(JSON.stringify({ error: "No ID provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const episodeNumber = Number(body.episodeNumber ?? paths[2] ?? url.searchParams.get("episodeNumber") ?? null);
        if (!episodeNumber) {
            return new Response(JSON.stringify({ error: "No episode number provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const providerId = body.providerId ?? paths[3] ?? url.searchParams.get("providerId") ?? null;
        if (!providerId) {
            return new Response(JSON.stringify({ error: "No provider ID provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const watchId = decodeURIComponent(body.watchId ?? paths[4] ?? url.searchParams.get("watchId") ?? "");
        if (!watchId || watchId.length === 0) {
            return new Response(JSON.stringify({ error: "No watch ID provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const subType = decodeURIComponent(body.subType ?? paths[5] ?? url.searchParams.get("subType") ?? "");
        if (!subType || subType.length === 0) {
            return new Response(JSON.stringify({ error: "No sub type provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        } else if (!["SUB", "DUB"].includes(subType.toUpperCase())) {
            return new Response(JSON.stringify({ error: "Sub type is invalid." }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const server = body.server ?? paths[6] ?? url.searchParams.get("server") ?? undefined ? (decodeURIComponent(body.server ?? paths[6] ?? url.searchParams.get("server") ?? undefined) as StreamingServers) : undefined;

        const cached = await redis.get(`sources:${id}:${episodeNumber}:${providerId}:${watchId}:${subType}:${server}`);
        if (cached) {
            return new Response(cached, {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        const data = await content.fetchSources(providerId, watchId, subType as SubType, server as StreamingServers);

        if (!data)
            return new Response(JSON.stringify({ error: "Sources not found." }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });

        if (data) queues.skipTimes.add({ id, episode: episodeNumber, toInsert: data });

        await redis.set(`sources:${id}:${episodeNumber}:${providerId}:${watchId}:${subType}:${server}`, JSON.stringify(data), "EX", cacheTime);

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
    method: "GET",
    path: "/sources",
    handler,
};

export default route;
