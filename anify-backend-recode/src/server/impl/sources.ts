import content from "../../content";
import { StreamingServers, SubType } from "../../types/enums";

export const handler = async (req: Request): Promise<Response> => {
    try {
        const url = new URL(req.url);
        const paths = url.pathname.split("/");
        paths.shift();

        const providerId = paths[1] ?? url.searchParams.get("providerId") ?? null;
        if (!providerId) {
            return new Response(JSON.stringify({ error: "No provider ID provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const watchId = decodeURIComponent(paths[2] ?? url.searchParams.get("watchId") ?? "");
        if (!watchId || watchId.length === 0) {
            return new Response(JSON.stringify({ error: "No watch ID provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const subType = decodeURIComponent(paths[3] ?? url.searchParams.get("subType") ?? "");
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

        const server = decodeURIComponent(paths[3] ?? url.searchParams.get("server") ?? "") as StreamingServers;

        const data = await content.fetchSources(providerId, watchId, subType.toUpperCase() as SubType, server);

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
