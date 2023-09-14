import { insertUser } from "../../database/impl/insert";
import { hashPassword } from "../../helper";

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

        const username = body?.username || paths[1] || url.searchParams.get("username");
        const password = body?.password || paths[2] || url.searchParams.get("password");
        const anilistId = body?.anilistId || paths[3] || url.searchParams.get("anilistId");
        const malId = body?.malId || paths[4] || url.searchParams.get("malId");
        const simklId = body?.simklId || paths[5] || url.searchParams.get("simklId");

        const passData = await hashPassword(password);

        const data = await insertUser({ anilistId, malId, simklId }, username, passData.password, passData.salt);
        if (!data) return new Response(JSON.stringify({ error: "User already exists." }), { status: 400, headers: { "Content-Type": "application/json" } });

        return new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } });
    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: "An error occurred." }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};

const route = {
    path: "/create-user",
    handler,
};

export default route;
