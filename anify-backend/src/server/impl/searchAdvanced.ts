import queues from "../../worker";
import { Format, Genres, Type } from "../../types/enums";
import { searchAdvanced } from "../../database/impl/search/searchAdvanced";
import { cacheTime, redis } from "..";

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

        const validTypes = ["anime", "manga", "novel"];

        const type = body?.type ?? url.searchParams.get("type") ?? null;
        if (!type) {
            return new Response(JSON.stringify({ error: "No type provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        } else if (!validTypes.includes(type.toLowerCase())) {
            return new Response(JSON.stringify({ error: "Invalid type provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const query = decodeURIComponent(body?.query ?? url.searchParams.get("query") ?? "");
        const genres = body?.genres ?? url.searchParams.get("genres")?.split(",") ?? [];
        const genresExcluded = body?.genresExcluded ?? url.searchParams.get("genresExcluded")?.split(",") ?? [];
        const tags = body?.tags ?? url.searchParams.get("tags")?.split(",") ?? [];
        const tagsExcluded = body?.tagsExcluded ?? url.searchParams.get("tagsExcluded")?.split(",") ?? [];
        const year = Number(body?.year ?? url.searchParams.get("year") ?? "0");
        const page = Number(body?.page ?? url.searchParams.get("page") ?? "1");
        const perPage = Number(body?.perPage ?? url.searchParams.get("perPage") ?? "20");

        const cached = await redis.get(`search-advanced:${type}:${query}:${genres}:${genresExcluded}:${tags}:${tagsExcluded}:${year}:${page}:${perPage}`);
        if (cached) {
            return new Response(cached, {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        const formats = type.toLowerCase() === "anime" ? [Format.MOVIE, Format.TV, Format.TV_SHORT, Format.OVA, Format.ONA, Format.OVA] : type.toLowerCase() === "manga" ? [Format.MANGA, Format.ONE_SHOT] : [Format.NOVEL];

        const data = await searchAdvanced(query, (type.toUpperCase() === "NOVEL" ? Type.MANGA : type.toUpperCase()) as Type, formats, page, perPage, genres as Genres[], genresExcluded as Genres[], year, tags, tagsExcluded);
        if (data.length === 0) {
            queues.searchQueue.add({ type: (type.toUpperCase() === "NOVEL" ? Type.MANGA : type.toUpperCase()) as Type, query: query, formats: formats, genres: genres as Genres[], genresExcluded: genresExcluded as Genres[], year: year, tags: tags, tagsExcluded: tagsExcluded });
        }

        await redis.set(`search-advanced:${type}:${query}:${genres}:${genresExcluded}:${tags}:${tagsExcluded}:${year}:${page}:${perPage}`, JSON.stringify(data), "EX", cacheTime);

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
    path: "/search-advanced",
    handler,
};

export default route;
