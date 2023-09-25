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
    const routeFiles = [await import("./impl/chapters.ts"), await import("./impl/contentData.ts"), await import("./impl/episodes.ts"), await import("./impl/info.ts"), await import("./impl/pages.ts"), await import("./impl/recent.ts"), await import("./impl/relations.ts"), await import("./impl/schedule.ts"), await import("./impl/search.ts"), await import("./impl/searchAdvanced.ts"), await import("./impl/seasonal.ts"), await import("./impl/sources.ts"), await import("./impl/stats.ts")];

    for (const file of routeFiles) {
        const routeModule = await file;
        const route = routeModule.default;

        if (route) {
            const { path, handler } = route;
            routes[path] = { path, handler };
        }
    }

    console.log(colors.gray(`Loaded ${colors.yellow(Object.keys(routes).length + "")} routes`));

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
