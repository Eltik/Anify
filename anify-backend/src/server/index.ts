import Redis from "ioredis";

import colors from "colors";

import { env } from "../env";
import { rateLimitMiddleware } from "./lib/rateLimit.ts";
import { apiKeyMiddleware } from "./lib/keys.ts";
import { getKeys } from "../database/impl/keys/key.ts";

export const redis: Redis = env.REDIS_URL
    ? new Redis((env.REDIS_URL as string) || "redis://localhost:6379")
    : ({
          get: async () => null,
          set: (): Promise<"OK"> => Promise.resolve("OK"),
          on: () => Redis.prototype,
          keys: async () => [],
          connect: async () => void 0,
          call: async () => void 0,
      } as any);

export const cacheTime = env.REDIS_CACHE_TIME || 60 * 60 * 24 * 7 * 2;

export const start = async () => {
    const apiKeys = await getKeys();
    for (const key of apiKeys ?? []) {
        await redis.sadd("apikeys", key.key);
    }

    console.log(colors.gray(`Loaded ${colors.yellow(apiKeys?.length + "")} API keys`));

    const routes: { [key: string]: { path: string; handler: (req: Request) => Promise<Response>; rateLimit: number } } = {};
    const routeFiles = [await import("./impl/chapters.ts"), await import("./impl/contentData.ts"), await import("./impl/episodes.ts"), await import("./impl/info.ts"), await import("./impl/pages.ts"), await import("./impl/recent.ts"), await import("./impl/relations.ts"), await import("./impl/schedule.ts"), await import("./impl/search.ts"), await import("./impl/searchAdvanced.ts"), await import("./impl/seasonal.ts"), await import("./impl/sources.ts"), await import("./impl/stats.ts"), await import("./impl/mixdrop.ts")];

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
            if (url.pathname === "/") return new Response("Welcome to Anify API! 🎉 Documentation can be viewed at https://docs.anify.tv. Join our Discord https://anify.tv/discord for more information.");

            const pathName = `/${url.pathname.split("/").slice(1)[0]}`;

            // Rate limit requests.
            const apiKey = await apiKeyMiddleware(req);

            if (routes[pathName]) {
                const { path, handler, rateLimit } = routes[pathName];
                const requests = !apiKey ? await rateLimitMiddleware(req, pathName) : null;

                if (requests && requests.requests > rateLimit) {
                    if (requests.requests > rateLimit * 2) console.log(colors.red(`Rate limit significantly exceeded for ${requests.ip}`));

                    return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers: { "Content-Type": "application/json" } });
                }

                return handler(req);
            }

            return new Response(JSON.stringify({ error: "Route not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
        },
    });

    console.log(colors.blue(`Server is now listening on ${env.PORT}`));
};
