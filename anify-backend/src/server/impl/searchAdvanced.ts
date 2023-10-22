import queues from "../../worker";
import { Format, Genres, Sort, SortDirection, Sorts, Type } from "../../types/enums";
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
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Max-Age": "2592000", "Access-Control-Allow-Headers": "*" },
            });
        } else if (!validTypes.includes(type.toLowerCase())) {
            return new Response(JSON.stringify({ error: "Invalid type provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Max-Age": "2592000", "Access-Control-Allow-Headers": "*" },
            });
        }

        const query = decodeURIComponent(body?.query ?? url.searchParams.get("query") ?? "");
        const formats = body?.formats ?? url.searchParams.get("formats")?.split(",") ?? type.toLowerCase() === "anime" ? [Format.MOVIE, Format.TV, Format.TV_SHORT, Format.OVA, Format.ONA, Format.OVA] : type.toLowerCase() === "manga" ? [Format.MANGA, Format.ONE_SHOT] : [Format.NOVEL];
        const genres = body?.genres ?? url.searchParams.get("genres")?.split(",") ?? [];
        const genresExcluded = body?.genresExcluded ?? url.searchParams.get("genresExcluded")?.split(",") ?? [];
        const tags = body?.tags ?? url.searchParams.get("tags")?.split(",") ?? [];
        const tagsExcluded = body?.tagsExcluded ?? url.searchParams.get("tagsExcluded")?.split(",") ?? [];
        const year = Number(body?.year ?? url.searchParams.get("year") ?? "0");
        const page = Number(body?.page ?? url.searchParams.get("page") ?? "1");
        const perPage = Number(body?.perPage ?? url.searchParams.get("perPage") ?? "20");
        const sort = body?.sort ?? url.searchParams.get("sort") ?? Sort.SCORE;
        const sortDirection = body?.sortDirection ?? url.searchParams.get("sortDirection") ?? SortDirection.ASC;

        // Check if sort is valid
        if (!Sorts.includes(sort as Sort)) {
            return new Response(JSON.stringify({ error: "Invalid sort provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Max-Age": "2592000", "Access-Control-Allow-Headers": "*" },
            });
        }
        if (sortDirection != SortDirection.ASC && sortDirection != SortDirection.DESC) {
            return new Response(JSON.stringify({ error: "Invalid sort direction provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Max-Age": "2592000", "Access-Control-Allow-Headers": "*" },
            });
        }

        const cached = await redis.get(`search-advanced:${type}:${query}:${JSON.stringify(formats)}:${genres}:${genresExcluded}:${tags}:${tagsExcluded}:${year}:${page}:${perPage}:${sort}:${sortDirection}`);
        if (cached) {
            return new Response(cached, {
                status: 200,
                headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Max-Age": "2592000", "Access-Control-Allow-Headers": "*" },
            });
        }

        const data = await searchAdvanced(query, (type.toUpperCase() === "NOVEL" ? Type.MANGA : type.toUpperCase()) as Type, formats, page, perPage, genres as Genres[], genresExcluded as Genres[], year, tags, tagsExcluded, sort, sortDirection);
        if (data.length === 0) {
            queues.searchQueue.add({ type: (type.toUpperCase() === "NOVEL" ? Type.MANGA : type.toUpperCase()) as Type, query: query, formats: formats, genres: genres as Genres[], genresExcluded: genresExcluded as Genres[], year: year, tags: tags, tagsExcluded: tagsExcluded });
        }

        await redis.set(`search-advanced:${type}:${query}:${JSON.stringify(formats)}:${genres}:${genresExcluded}:${tags}:${tagsExcluded}:${year}:${page}:${perPage}:${sort}:${sortDirection}`, JSON.stringify(data), "EX", cacheTime);

        return new Response(JSON.stringify(data), {
            status: 200,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Max-Age": "2592000", "Access-Control-Allow-Headers": "*" },
        });
    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: "An error occurred." }), {
            status: 500,
            headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS", "Access-Control-Max-Age": "2592000", "Access-Control-Allow-Headers": "*" },
        });
    }
};

const route = {
    path: "/search-advanced",
    handler,
    rateLimit: 30,
};

export default route;
