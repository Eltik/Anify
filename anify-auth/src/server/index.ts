import { readdirSync } from "node:fs";
import { join } from "node:path";

import Redis from "ioredis";

import colors from "colors";

import { env } from "../env";
import { providerRoutes } from "../providers";

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
    const routeFiles = [await import("./impl/createUser.ts"), await import("./impl/login.ts"), await import("./impl/providers.ts"), await import("./impl/updateUser.ts"), await import("./impl/user.ts")];

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
            if (url.pathname === "/") return new Response("Welcome to Anify authentication! 🎉 Documentation can be viewed at https://docs.anify.tv. Join our Discord https://anify.tv/discord for more information.", { headers: { "Content-Type": "application/json" } });

            const pathName = `/${url.pathname.split("/").slice(1)[0]}`;
            const fullRoute = `/${url.pathname.split("/").slice(1).join("/")}`;

            for (const route of providerRoutes) {
                if (`/${route.prefix}` === pathName) {
                    const routes = route.controller();
                    for (const suffix of routes) {
                        if (`/${route.prefix}${suffix.path}` === fullRoute) {
                            console.log("WOWOOWOW");
                            return suffix.handler(req);
                        }
                    }
                }
            }

            if (routes[pathName]) {
                const { path, handler } = routes[pathName];
                return handler(req);
            }

            return new Response(JSON.stringify({ error: "Route not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
        },
    });

    console.log(colors.blue(`Server is now listening on ${env.PORT}`));
};
