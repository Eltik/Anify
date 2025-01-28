import Redis from "ioredis";

import colors from "colors";

import { env } from "../env.ts";
import middleware from "./impl/middleware/index.ts";
import routes from "./impl/routes/index.ts";

export const redis: Redis = env.REDIS_URL
    ? new Redis(env.REDIS_URL || "redis://localhost:6379")
    : ({
          get: async () => null,
          set: (): Promise<"OK"> => Promise.resolve("OK"),
          on: () => Redis.prototype,
          keys: async () => [],
          connect: async () => void 0,
          call: async () => void 0,
      } as unknown as Redis);

const start = async () => {
    const routesData: {
        [key: string]: { path: string; handler: (req: Request) => Promise<Response>; rateLimit: number };
    } = {};

    for (const data of Object.values(routes)) {
        if (data) {
            const { path, handler, rateLimit } = data;
            routesData[path] = { path, handler, rateLimit };
        }
    }

    console.log(colors.gray(`Loaded ${colors.yellow(`${Object.keys(routes).length}`)} routes`));

    Bun.serve({
        port: env.PORT,
        async fetch(req: Request) {
            const url = new URL(req.url);
            if (url.pathname === "/") return middleware.createResponse("Welcome to Anify API! 🎉", 200, { "Content-Type": "text/plain" });

            const pathName = `/${url.pathname.split("/").slice(1)[0]}`;

            if (routesData[pathName]) {
                const { handler, rateLimit } = routesData[pathName];
                const requests = await middleware.rateLimit(req, pathName);

                if (requests && requests.requests > rateLimit) {
                    // Will only log up to 10 times
                    if (requests.requests > rateLimit * 2 && requests.requests < rateLimit * 2 + 10) console.log(colors.red(`Rate limit significantly exceeded for ${requests.ip} - ${pathName}`));

                    return middleware.createResponse(JSON.stringify({ error: "Too many requests" }), 429);
                }

                return handler(req);
            }

            return middleware.createResponse(JSON.stringify({ error: "Route not found" }), 404);
        },
    });

    console.log(colors.blue(`Server is now listening on ${env.PORT}`));
};

export default {
    start,
};
