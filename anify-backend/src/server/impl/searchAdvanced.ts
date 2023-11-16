import queues from "../../worker";
import { Format, Formats, Genres, Season, Sort, SortDirection, Sorts, Type } from "../../types/enums";
import { searchAdvanced } from "../../database/impl/search/searchAdvanced";
import { cacheTime, redis } from "..";
import { createResponse } from "../lib/response";

export const handler = async (req: Request): Promise<Response> => {
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

        const validTypes = ["anime", "manga", "novel"];

        const type = body?.type ?? url.searchParams.get("type") ?? null;
        if (!type) {
            return createResponse(JSON.stringify({ error: "No type provided." }), 400);
        } else if (!validTypes.includes(type.toLowerCase())) {
            return createResponse(JSON.stringify({ error: "Invalid type provided." }), 400);
        }

        const query = body?.query ?? url.searchParams.get("query") ?? "";
        const formats = body?.formats ?? url.searchParams.get("formats")?.split(",") ?? (type.toLowerCase() === "anime" ? [Format.MOVIE, Format.TV, Format.TV_SHORT, Format.OVA, Format.ONA, Format.OVA] : type.toLowerCase() === "manga" ? [Format.MANGA, Format.ONE_SHOT] : [Format.NOVEL]);
        const genres = body?.genres ?? url.searchParams.get("genres")?.split(",") ?? [];
        const genresExcluded = body?.genresExcluded ?? url.searchParams.get("genresExcluded")?.split(",") ?? [];
        const tags = body?.tags ?? url.searchParams.get("tags")?.split(",") ?? [];
        const tagsExcluded = body?.tagsExcluded ?? url.searchParams.get("tagsExcluded")?.split(",") ?? [];
        const season = body?.season ?? (url.searchParams.get("season") as Season) ?? null;
        const year = Number(body?.year ?? url.searchParams.get("year") ?? "0");
        const page = Number(body?.page ?? url.searchParams.get("page") ?? "1");
        const perPage = Number(body?.perPage ?? url.searchParams.get("perPage") ?? "20");
        const sort = body?.sort ?? url.searchParams.get("sort") ?? Sort.TITLE;
        const sortDirection = body?.sortDirection ?? url.searchParams.get("sortDirection") ?? SortDirection.ASC;

        // Check if formats are valid
        formats
            .filter((f: string) => !Formats.includes(f as Format))
            .forEach((f: string) => {
                formats.splice(formats.indexOf(f), 1);
            });

        // Check if sort is valid
        if (!Sorts.includes(sort as Sort)) {
            return createResponse(JSON.stringify({ error: "Invalid sort provided." }), 400);
        }
        if (sortDirection != SortDirection.ASC && sortDirection != SortDirection.DESC) {
            return createResponse(JSON.stringify({ error: "Invalid sort direction provided." }), 400);
        }

        const cached = await redis.get(`search-advanced:${type}:${query}:${JSON.stringify(formats)}:${genres}:${genresExcluded}:${tags}:${tagsExcluded}:${season}:${year}:${page}:${perPage}:${sort}:${sortDirection}`);
        if (cached) {
            return createResponse(cached);
        }

        const data = await searchAdvanced(query, (type.toUpperCase() === "NOVEL" ? Type.MANGA : type.toUpperCase()) as Type, formats as Format[], page, perPage, genres as Genres[], genresExcluded as Genres[], season, year, tags, tagsExcluded, sort as Sort, sortDirection);
        if (data.results.length === 0) {
            queues.searchQueue.add({
                type: (type.toUpperCase() === "NOVEL" ? Type.MANGA : type.toUpperCase()) as Type,
                query: query,
                formats: formats as Format[],
                genres: genres as Genres[],
                genresExcluded: genresExcluded as Genres[],
                season: season,
                year: year,
                tags: tags,
                tagsExcluded: tagsExcluded,
            });
        }

        await redis.set(`search-advanced:${type}:${query}:${JSON.stringify(formats)}:${genres}:${genresExcluded}:${tags}:${tagsExcluded}:${season}:${year}:${page}:${perPage}:${sort}:${sortDirection}`, JSON.stringify(data), "EX", cacheTime);

        return createResponse(JSON.stringify(data));
    } catch (e) {
        console.error(e);
        return createResponse(JSON.stringify({ error: "An error occurred." }), 500);
    }
};

const route = {
    path: "/search-advanced",
    handler,
    rateLimit: 30,
};

type Body = {
    type: string;
    query?: string;
    formats?: Format[];
    genres?: Genres[];
    genresExcluded?: Genres[];
    tags?: string[];
    tagsExcluded?: string[];
    season?: Season;
    year?: number;
    page?: number;
    perPage?: number;
    sort?: Sort;
    sortDirection?: SortDirection;
};

export default route;
