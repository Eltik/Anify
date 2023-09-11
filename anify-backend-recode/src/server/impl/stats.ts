import { cacheTime, redis } from "..";
import { stats } from "../../database/impl/misc/stats";
import { get } from "../../database/impl/modify/get";

export const handler = async (req: Request): Promise<Response> => {
    try {
        const url = new URL(req.url);
        const paths = url.pathname.split("/");
        paths.shift();

        const cached = await redis.get(`stats`);
        if (cached) {
            return new Response(JSON.stringify(cached), {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        const data = await stats();
        if (!data) {
            return new Response(JSON.stringify({ error: "No data found." }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });
        }

        await redis.set(`stats`, JSON.stringify(data), "EX", cacheTime);

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
    path: "/stats",
    handler,
};

export default route;
