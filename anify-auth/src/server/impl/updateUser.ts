import { get } from "../../database/impl/get";
import { updateUser } from "../../database/impl/update";

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

        const id = body?.id || paths[1] || url.searchParams.get("id");
        const anilistId = body?.anilistId || paths[2] || url.searchParams.get("anilistId");
        const malId = body?.malId || paths[3] || url.searchParams.get("malId");
        const simklId = body?.simklId || paths[4] || url.searchParams.get("simklId");

        if (!id) return new Response(JSON.stringify({ error: "No user ID provided." }), { status: 400, headers: { "Content-Type": "application/json" } });

        await updateUser(id, { anilistId, malId, simklId });

        return new Response(JSON.stringify(await get(id)), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: "An error occurred." }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};

const route = {
    path: "/update-user",
    handler,
};

export default route;
