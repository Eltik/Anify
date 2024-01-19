import Redis from "ioredis";

import colors from "colors";

import { env } from "../env";
import { rateLimitMiddleware } from "./lib/rateLimit.ts";
import { apiKeyMiddleware, rateLimitApiKeyMiddleware } from "./lib/keys.ts";
import { getKeys } from "../database/impl/keys/key.ts";
import { createResponse } from "./lib/response.ts";

export const redis: Redis = env.REDIS_URL
    ? new Redis((env.REDIS_URL as string) || "redis://localhost:6379")
    : ({
          get: async () => null,
          del: async () => void 0,
          set: (): Promise<"OK"> => Promise.resolve("OK"),
          sadd: (): Promise<number> => Promise.resolve(0),
          sismember: (): Promise<number> => Promise.resolve(0),
          on: () => Redis.prototype,
          keys: async () => [],
          connect: async () => void 0,
          call: async () => void 0,
      } as any);

export const cacheTime = env.REDIS_CACHE_TIME || 60 * 60 * 24 * 7 * 2;

export const start = async () => {
    const apiKeys = await getKeys();
    for (const key of apiKeys ?? []) {
        await redis.set(`apikey:${key.key}`, JSON.stringify(key));
        await redis.sadd("apikeys", key.key);
    }

    console.log(colors.gray(`Loaded ${colors.yellow(apiKeys?.length + "")} API keys`));

    const routes: {
        [key: string]: { path: string; handler: (req: Request) => Promise<Response>; rateLimit: number };
    } = {};
    const routeFiles = [
        await import("./impl/chapters.ts"),
        await import("./impl/subtitles.ts"),
        await import("./impl/contentData.ts"),
        await import("./impl/episodes.ts"),
        await import("./impl/map.ts"),
        await import("./impl/media.ts"),
        await import("./impl/info.ts"),
        await import("./impl/pages.ts"),
        await import("./impl/recent.ts"),
        await import("./impl/relations.ts"),
        await import("./impl/schedule.ts"),
        await import("./impl/search.ts"),
        await import("./impl/searchAdvanced.ts"),
        await import("./impl/seasonal.ts"),
        await import("./impl/sources.ts"),
        await import("./impl/stats.ts"),
        await import("./impl/mixdrop.ts"),
        await import("./impl/skipTimes.ts"),
    ];

    for (const file of routeFiles) {
        const routeModule = await file;
        const route = routeModule.default;

        if (route) {
            const { path, handler, rateLimit } = route;
            routes[path] = { path, handler, rateLimit };
        }
    }

    console.log(colors.gray(`Loaded ${colors.yellow(Object.keys(routes).length + "")} routes`));

    Bun.serve({
        port: env.PORT,
        async fetch(req: Request) {
            const url = new URL(req.url);
            if (url.pathname === "/") return createResponse("Welcome to Anify API! 🎉 Documentation can be viewed at https://docs.anify.tv. Join our Discord https://anify.tv/discord for additional help/information.", 200, { "Content-Type": "text/plain" });

            const pathName = `/${url.pathname.split("/").slice(1)[0]}`;

            // Rate limit requests.
            const apiKey = await apiKeyMiddleware(req);
            await rateLimitApiKeyMiddleware(req);

            if (routes[pathName]) {
                const { path, handler, rateLimit } = routes[pathName];
                const requests = !apiKey ? await rateLimitMiddleware(req, pathName) : null;

                if (requests && requests.requests > rateLimit) {
                    // Will only log up to 10 times
                    if (requests.requests > rateLimit * 2 && requests.requests < rateLimit * 2 + 10) console.log(colors.red(`Rate limit significantly exceeded for ${requests.ip} - ${pathName}`));

                    return createResponse(JSON.stringify({ error: "Too many requests" }), 429);
                }

                return handler(req);
            }

            return createResponse(JSON.stringify({ error: "Route not found" }), 404);
        },
    });

    console.log(colors.blue(`Server is now listening on ${env.PORT}`));
};
