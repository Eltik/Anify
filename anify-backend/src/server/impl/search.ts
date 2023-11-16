import queues from "../../worker";
import { search } from "../../database/impl/search/search";
import { Format, Sort, SortDirection, Sorts, Type } from "../../types/enums";
import { cacheTime, redis } from "..";
import { createResponse } from "../lib/response";

export const handler = async (req: Request): Promise<Response> => {
    try {
        const url = new URL(req.url);
        const paths = url.pathname.split("/");
        paths.shift();

        const validTypes = ["anime", "manga", "novel"];

        const body =
            req.method === "POST"
                ? ((await req.json().catch(() => {
                      return null;
                  })) as Body)
                : null;

        const type = body?.type ?? paths[1] ?? url.searchParams.get("type") ?? null;
        if (!type) {
            return createResponse(JSON.stringify({ error: "No type provided." }), 400);
        } else if (!validTypes.includes(type.toLowerCase())) {
            return createResponse(JSON.stringify({ error: "Invalid type provided." }), 400);
        }

        const query = body?.query ?? paths[2] ?? url.searchParams.get("query") ?? "";
        if (!query || query.length === 0) {
            return createResponse(JSON.stringify({ error: "No query provided." }), 400);
        }

        const page = Number(body?.page ?? paths[3] ?? url.searchParams.get("page") ?? "1");
        const perPage = Number(body?.perPage ?? paths[4] ?? url.searchParams.get("perPage") ?? "20");
        const sort = body?.sort ?? paths[5] ?? url.searchParams.get("sort") ?? Sort.TITLE;
        const sortDirection = body?.sortDirection ?? paths[5] ?? url.searchParams.get("sortDirection") ?? SortDirection.ASC;

        // Check if sort is valid
        if (!Sorts.includes(sort as Sort)) {
            return createResponse(JSON.stringify({ error: "Invalid sort provided." }), 400);
        }
        if (sortDirection != SortDirection.ASC && sortDirection != SortDirection.DESC) {
            return createResponse(JSON.stringify({ error: "Invalid sort direction provided." }), 400);
        }

        const cached = await redis.get(`search:${type}:${query}:${page}:${perPage}:${sort}:${sortDirection}`);
        if (cached) {
            return createResponse(cached);
        }

        const formats = type.toLowerCase() === "anime" ? [Format.MOVIE, Format.TV, Format.TV_SHORT, Format.OVA, Format.ONA, Format.OVA] : type.toLowerCase() === "manga" ? [Format.MANGA, Format.ONE_SHOT] : [Format.NOVEL];

        const data = await search(query, (type.toUpperCase() === "NOVEL" ? Type.MANGA : type.toUpperCase()) as Type, formats, page, perPage, sort as Sort, sortDirection);
        if (data.results.length === 0) {
            queues.searchQueue.add({
                type: (type.toUpperCase() === "NOVEL" ? Type.MANGA : type.toUpperCase()) as Type,
                query: query,
                formats: formats,
            });
        }

        await redis.set(`search:${type}:${query}:${page}:${perPage}:${sort}:${sortDirection}`, JSON.stringify(data), "EX", cacheTime);

        return createResponse(JSON.stringify(data), 200);
    } catch (e) {
        console.error(e);
        return createResponse(JSON.stringify({ error: "An error occurred." }), 500);
    }
};

const route = {
    path: "/search",
    handler,
    rateLimit: 30,
};

type Body = {
    type: string;
    query: string;
    page?: number;
    perPage?: number;
    sort?: string;
    sortDirection?: string;
};

export default route;
