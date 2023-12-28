import { cacheTime, redis } from "..";
import { get } from "../../database/impl/fetch/get";
import { Format, Formats, Type } from "../../types/enums";
import { createResponse } from "../lib/response";
import queues from "../../worker";

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

        const id = body?.id ?? paths[1] ?? url.searchParams.get("id") ?? null;
        const type = body?.type ?? paths[2] ?? url.searchParams.get("type") ?? null;
        const formats = body?.formats ?? url.searchParams.get("formats")?.split(",") ?? (type?.toLowerCase() === "anime" ? [Format.MOVIE, Format.TV, Format.TV_SHORT, Format.OVA, Format.ONA, Format.OVA] : type?.toLowerCase() === "manga" ? [Format.MANGA, Format.ONE_SHOT] : [Format.NOVEL]);

        formats
            .filter((f: string) => !Formats.includes(f as Format))
            .forEach((f: string) => {
                formats.splice(formats.indexOf(f), 1);
            });

        if (!id) {
            return createResponse(JSON.stringify({ error: "No ID provided." }), 400);
        }
        if (!type) {
            return createResponse(JSON.stringify({ error: "No type provided." }), 400);
        }
        if (!formats) {
            return createResponse(JSON.stringify({ error: "No formats provided." }), 400);
        }

        console.log(formats);

        let fields: string[] = body?.fields ?? [];
        const fieldsParam = url.searchParams.get("fields");

        if (fieldsParam && fieldsParam.startsWith("[") && fieldsParam.endsWith("]")) {
            const fieldsArray = fieldsParam
                .slice(1, -1)
                .split(",")
                .map((field) => field.trim());
            fields = fieldsArray.filter(Boolean);
        }

        const cached = await redis.get(`map:${id}:${type}:${JSON.stringify(formats)}:${JSON.stringify(fields)}`);
        if (cached) {
            return createResponse(cached);
        }

        const data = await get(String(id), fields);
        if (data) {
            return createResponse(JSON.stringify(data));
        }

        queues.mappingQueue.add({ id, formats: formats as Format[], type: type as Type });

        const result = {
            success: true,
        };

        await redis.set(`map:${id}:${type}:${JSON.stringify(formats)}:${JSON.stringify(fields)}`, JSON.stringify(result), "EX", cacheTime);

        return createResponse(JSON.stringify(result));
    } catch (e) {
        console.error(e);
        return createResponse(JSON.stringify({ error: "An error occurred." }), 500);
    }
};

const route = {
    path: "/map",
    handler,
    rateLimit: 10,
};

type Body = {
    id: string;
    type: Type;
    formats: [Format];
    fields?: string[];
};

export default route;
