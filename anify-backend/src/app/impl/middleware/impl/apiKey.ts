import { ApiKeyRepository } from "../../../../database/impl/wrapper/impl/apiKey";
import { IApiKey } from "../../../../types/impl/database/impl/schema/apiKey";
import { redis } from "../../..";
import createResponse from "./response";
import { db } from "../../../../database";

export default async (req: Request): Promise<IApiKey | Response> => {
    const apiKey = req.headers.get("X-API-Key") ?? new URL(req.url).searchParams.get("apikey");

    if (!apiKey) {
        return createResponse(JSON.stringify({ error: "No API key provided." }), 401);
    }

    const cachedKey = await redis.get(`api-key:${apiKey}`);
    if (cachedKey) {
        try {
            const parsedKey = JSON.parse(cachedKey);
            if (typeof parsedKey.valid === "boolean" && parsedKey.valid === false) {
                return createResponse(JSON.stringify({ error: "Invalid API key." }), 401);
            }
            return parsedKey as IApiKey;
        } catch (e) {
            console.error("Failed to parse cached API key:", e);
        }
    }

    const dbApiKey = await ApiKeyRepository.getByKey(db, apiKey);

    if (!dbApiKey) {
        await redis.set(`api-key:${apiKey}`, JSON.stringify({ valid: false }), "EX", 60);
        return createResponse(JSON.stringify({ error: "Invalid API key." }), 401);
    }

    await redis.set(`api-key:${apiKey}`, JSON.stringify(dbApiKey), "EX", 3600);

    return dbApiKey;
};
