import { redis } from "../../..";
import { db } from "../../../../database";
import { MediaRepository } from "../../../../database/impl/wrapper/impl/media";
import { env } from "../../../../env";
import middleware from "../../middleware";

const handler = async (req: Request): Promise<Response> => {
    try {
        const url = new URL(req.url);
        const paths = url.pathname.split("/");
        paths.shift();

        const cached = await redis.get("stats");
        if (cached) {
            return middleware.createResponse(cached);
        }

        const data = await MediaRepository.getStats(db);
        if (!data) {
            return middleware.createResponse(JSON.stringify({ error: "No data found." }), 404);
        }

        await redis.set("stats", JSON.stringify(data), "EX", env.REDIS_CACHE_TIME);

        return middleware.createResponse(JSON.stringify(data));
    } catch (e) {
        console.error(e);
        return middleware.createResponse(JSON.stringify({ error: "An error occurred." }), 500);
    }
};

const route = {
    path: "/stats",
    handler,
    rateLimit: 60,
};

export default route;
