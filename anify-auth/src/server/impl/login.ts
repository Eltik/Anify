import { login } from "../../database/impl/login";

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

        const data = await login(username, password);
        if (!data) return new Response(JSON.stringify({ error: "Invalid username/password." }), { status: 400, headers: { "Content-Type": "application/json" } });

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
    path: "/login",
    handler,
};

export default route;
