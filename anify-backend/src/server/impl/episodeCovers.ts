import { cacheTime, redis } from "..";
import { get } from "../../database/impl/modify/get";
import { env } from "../../env";

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

        const id = body?.id ?? paths[1] ?? url.searchParams.get("id") ?? null;
        if (!id) {
            return new Response(JSON.stringify({ error: "No ID provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const simklClientId = env.SIMKL_CLIENT_ID;

        if (!simklClientId)
            return new Response(JSON.stringify({ error: "No SIMKL credentials provided." }), {
                status: 500,
                headers: { "Content-Type": "application/json" },
            });

        const episodeCovers: { episode: number; img: string }[] = [];

        const media = await get(id);
        if (!media)
            return new Response(JSON.stringify({ error: "Media not found." }), {
                status: 404,
                headers: { "Content-Type": "application/json" },
            });

        const aniListId = media.mappings.find((mapping) => mapping.providerId === "anilist")?.id;

        const searchQuery = await (await fetch(`https://api.simkl.com/search/id?anilist=${aniListId}&client_id=${simklClientId}`)).json();
        const simklId = searchQuery[0]?.ids?.simkl;

        const data = await (await fetch(`https://api.simkl.com/anime/episodes/${simklId}?client_id=${simklClientId}`)).json();

        for (const episode of data) {
            if (!episode.img) continue;
            episodeCovers.push({
                episode: episode.episode,
                img: `https://simkl.in/episodes/${episode.img}_c.jpg`,
            });
        }

        const cached = await redis.get(`episode-covers:${id}`);
        if (cached) {
            return new Response(cached, {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        await redis.set(`episode-covers:${id}`, JSON.stringify(episodeCovers), "EX", cacheTime);

        return new Response(JSON.stringify(episodeCovers), {
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
    path: "/episode-covers",
    handler,
};

export default route;
