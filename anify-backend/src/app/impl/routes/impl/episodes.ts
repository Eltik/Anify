import { redis } from "../../..";
import { db } from "../../../../database";
import { MediaRepository } from "../../../../database/impl/wrapper/impl/media";
import { env } from "../../../../env";
import lib from "../../../../lib";
import middleware from "../../middleware";
import { MediaType } from "../../../../types";

const handler = async (req: Request): Promise<Response> => {
    try {
        const url = new URL(req.url);
        const paths = url.pathname.split("/");
        paths.shift();

        const body =
            req.method === "POST"
                ? ((await req.json().catch(() => {
                      return null;
                  })) as Body)
                : null;

        const id = body?.id ?? paths[1] ?? url.searchParams.get("id") ?? null;
        if (!id) {
            return middleware.createResponse(JSON.stringify({ error: "No ID provided." }), 400);
        }

        const cached = await redis.get(`episodes:${id}`);
        if (cached) {
            return middleware.createResponse(cached);
        }

        // First check if the media exists and is an anime
        const media = await MediaRepository.getByIdAuto(db, id);
        if (!media) {
            return middleware.createResponse(JSON.stringify({ error: "Media not found." }), 404);
        }

        if (media.type !== MediaType.ANIME) {
            return middleware.createResponse(JSON.stringify({ error: "Media is not an anime." }), 400);
        }

        const data = await lib.content.loadEpisodes(media);

        await redis.set(`episodes:${id}`, JSON.stringify(data), "EX", env.REDIS_CACHE_TIME);

        return middleware.createResponse(JSON.stringify(data));
    } catch (e) {
        console.error(e);
        return middleware.createResponse(JSON.stringify({ error: "An error occurred." }), 500);
    }
};

const route = {
    path: "/episodes",
    handler,
    rateLimit: 40,
};

type Body = {
    id: string;
};

export default route;
