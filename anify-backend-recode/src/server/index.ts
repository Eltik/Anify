import { readdirSync } from "node:fs";
import { join } from "node:path";

import Redis from "ioredis";

import colors from "colors";

import { env } from "../env";

export const start = async () => {
    const redis = new Redis((env.REDIS_URL as string) || "redis://localhost:6379");
    const cacheTime = env.REDIS_CACHE_TIME;

    const whitelist = env.API_KEY_WHITELIST;

    Bun.serve({
        port: env.PORT,
        async fetch(req: Request) {
            const url = new URL(req.url);
            if (url.pathname === "/") return new Response("Welcome to Anify API! 🎉 Documentation can be viewed at https://docs.anify.tv. Join our Discord https://anify.tv/discord for more information.", { headers: { "Content-Type": "application/json" } });

            // Dynamically add routes
            const routeFiles = readdirSync(join(__dirname, "./impl"));
            for (const file of routeFiles) {
                const routeModule = await import(join(__dirname, "./impl", file));
                const route = routeModule.default;

                if (route) {
                    const { path, handler } = route;
                    const pathName = url.pathname.split("/").slice(1)[0];

                    if (path === `/${pathName}`) {
                        return handler(req);
                    }
                }
            }

            return new Response(JSON.stringify({ error: "Route not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
        },
    });

    console.log(colors.blue(`Server is now listening on ${env.PORT}`));
};
