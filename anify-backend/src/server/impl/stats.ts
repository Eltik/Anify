import { cacheTime, redis } from "..";
import { stats } from "../../database/impl/fetch/stats";
import { get } from "../../database/impl/fetch/get";

export const handler = async (req: Request): Promise<Response> => {
    try {
        const url = new URL(req.url);
        const paths = url.pathname.split("/");
        paths.shift();

        const cached = await redis.get(`stats`);
        if (cached) {
            return new Response(cached, {
                status: 200,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Max-Age": "2592000",
                    "Access-Control-Allow-Headers": "*",
                },
            });
        }

        const data = await stats();
        if (!data) {
            return new Response(JSON.stringify({ error: "No data found." }), {
                status: 404,
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Max-Age": "2592000",
                    "Access-Control-Allow-Headers": "*",
                },
            });
        }

        await redis.set(`stats`, JSON.stringify(data), "EX", cacheTime);

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Max-Age": "2592000",
                "Access-Control-Allow-Headers": "*",
            },
        });
    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: "An error occurred." }), {
            status: 500,
            headers: {
                "Content-Type": "application/json",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Max-Age": "2592000",
                "Access-Control-Allow-Headers": "*",
            },
        });
    }
};

const route = {
    path: "/stats",
    handler,
    rateLimit: 60,
};

export default route;
