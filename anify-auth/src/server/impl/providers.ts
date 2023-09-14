import { cacheTime, redis } from "..";
import { AUTH_PROVIDERS } from "../../providers";

export const handler = async (req: Request): Promise<Response> => {
    try {
        const url = new URL(req.url);
        const paths = url.pathname.split("/");
        paths.shift();

        const cached = await redis.get(`auth-providers`);
        if (cached) {
            return new Response(JSON.stringify(cached), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        const data = AUTH_PROVIDERS.map((x) => {
            return {
                id: x.id,
                url: x.url,
                name: x.name,
                icon: x.icon,
                oauth: x.oauthURL,
            };
        });

        if (!data) {
            return new Response(JSON.stringify({ error: "No data found." }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }

        await redis.set(`auth-providers`, JSON.stringify(data), "EX", cacheTime);

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
    path: "/providers",
    handler,
};

export default route;
