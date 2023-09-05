import os from "node:os";
import { readdirSync } from "node:fs";
import { join } from "node:path";

import Redis from "ioredis";
import RedisStore from "rate-limit-redis";

import colors from "colors";

import { env } from "../env";
import { importKeys } from "../keys";
import { createLoop } from "../tasks";

const numCPUs = os.cpus().length;

const redis = new Redis((env.REDIS_URL as string) || "redis://localhost:6379");

const cacheTime = env.REDIS_CACHE_TIME;

const whitelist = env.API_KEY_WHITELIST;

export const start = async () => {
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
                    const { method, path, handler } = route;
                    if (method === req.method && path === url.pathname) {
                        return handler(req);
                    }
                }
            }

            return new Response(JSON.stringify({ error: "Not found" }), { status: 404, headers: { "Content-Type": "application/json" } });
        },
    });

    console.log(colors.blue(`Server is now listening on ${env.PORT}`));
    await importKeys();
    await createLoop();
};
