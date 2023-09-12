import { readdirSync } from "node:fs";
import { join } from "node:path";

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
    const routes: { [key: string]: { path: string; handler: (req: Request) => Promise<Response> } } = {};
    const routeFiles = readdirSync(join(import.meta.dir, "./impl"));
    for (const file of routeFiles) {
        const routeModule = await import(join(import.meta.dir, "./impl", file));
        const route = routeModule.default;

        if (route) {
            const { path, handler } = route;
            routes[path] = { path, handler };
        }
    }

    Bun.serve({
        port: env.PORT,
        async fetch(req: Request) {
            const url = new URL(req.url);
            if (url.pathname === "/") return new Response("Welcome to Anify API! 🎉 Documentation can be viewed at https://docs.anify.tv. Join our Discord https://anify.tv/discord for more information.", { headers: { "Content-Type": "application/json" } });

            const pathName = `/${url.pathname.split("/").slice(1)[0]}`;

            if (routes[pathName]) {
                const { path, handler } = routes[pathName];
                return handler(req);
            }

            return new Response(JSON.stringify({ error: "Route not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
        },
    });

    console.log(colors.blue(`Server is now listening on ${env.PORT}`));
};
