import content from "../../content";

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

        const readId = decodeURIComponent(paths[2] ?? url.searchParams.get("readId") ?? "");
        if (!readId || readId.length === 0) {
            return new Response(JSON.stringify({ error: "No read ID provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const data = await content.fetchPages(providerId, readId);

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
    path: "/pages",
    handler,
};

export default route;
