import Redis from "ioredis";

import colors from "colors";

import { env } from "../env";

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
    const routes: { [key: string]: { path: string; handler: (req: Request) => Promise<Response>; rateLimit: number } } = {};
    const routeFiles = [await import("./impl/chapters.ts"), await import("./impl/contentData.ts"), await import("./impl/episodes.ts"), await import("./impl/info.ts"), await import("./impl/pages.ts"), await import("./impl/recent.ts"), await import("./impl/relations.ts"), await import("./impl/schedule.ts"), await import("./impl/search.ts"), await import("./impl/searchAdvanced.ts"), await import("./impl/seasonal.ts"), await import("./impl/sources.ts"), await import("./impl/stats.ts")];

    for (const file of routeFiles) {
        const routeModule = await file;
        const route = routeModule.default;

        if (route) {
            const { path, handler, rateLimit } = route;
            routes[path] = { path, handler, rateLimit };
        }
    }

    console.log(colors.gray(`Loaded ${colors.yellow(Object.keys(routes).length + "")} routes`));

    // Middleware to implement rate limiting.
    const rateLimitMiddleware = async (req: Request): Promise<{ ip: string; timestamp: number; requests: number }> => {
        const ip = req.headers.get("cf-connecting-ip") ?? "none"; // You may need to adjust this based on your actual IP detection method.
        const now = new Date(Date.now()).getTime();
        if (!(await redis.get(`rate-limit:${ip}`))) {
            await redis.set(`rate-limit:${ip}`, JSON.stringify({ ip, timestamp: now, requests: 1 }), "EX", 60000);
            return { ip, timestamp: now, requests: 0 };
        }

        const requests: { ip: string; timestamp: number; requests: number } = JSON.parse(((await redis.get(`rate-limit:${ip}`)) as string) ?? []) || [];

        // Add the current request timestamp to the list.
        await redis.set(`rate-limit:${ip}`, JSON.stringify({ ip, timestamp: now, requests: requests.requests + 1 }), "EX", 60000);

        setTimeout(async () => {
            // Remove the request timestamp after 1 minute.
            const requests: { ip: string; timestamp: number; requests: number } = JSON.parse(((await redis.get(`rate-limit:${ip}`)) as string) ?? []) || [];
            if (requests.timestamp < new Date(Date.now()).getTime() - 60000) {
                await redis.del(`rate-limit:${ip}`);
            }
        }, 60000);

        // To clear all keys
        /*
        await redis.keys("rate-limit:*").then(async (keys) => {
            console.log(keys);
            await redis.del(keys);
        });
        */

        return { ip, timestamp: now, requests: requests.requests++ };
    };

    Bun.serve({
        port: env.PORT,
        async fetch(req: Request) {
            const url = new URL(req.url);
            if (url.pathname === "/") return new Response("Welcome to Anify API! 🎉 Documentation can be viewed at https://docs.anify.tv. Join our Discord https://anify.tv/discord for more information.", { headers: { "Content-Type": "application/json" } });

            const pathName = `/${url.pathname.split("/").slice(1)[0]}`;

            // Rate limit requests.
            const requests = await rateLimitMiddleware(req);
            // return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429, headers: { "Content-Type": "application/json" } });

            if (routes[pathName]) {
                const { path, handler, rateLimit } = routes[pathName];
                if (requests.requests > rateLimit) {
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
