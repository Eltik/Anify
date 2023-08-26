import dotenv from "dotenv";
dotenv.config();

import { env } from "./env";
import { AUTH_PROVIDERS, routes } from "./providers";
import { Redis } from "ioredis";
import colors from "colors";
import Fastify from "fastify";
import FastifyCors from "@fastify/cors";
import { fetchSettings, fetchUser, insertUser, login, updateSettings, updateUser } from "./lib/impl/database";
import { Settings } from "./lib/types";
import { hashPassword } from "./helper";

export let redis = new Redis(env.REDIS_URL as string);

if (!env.REDIS_URL) {
    console.log(colors.yellow("No Redis URL provided. Caching will be disabled."));
    redis = {
        get: async () => null,
        set: (): Promise<"OK"> => Promise.resolve("OK"),
        on: () => Redis.prototype,
        keys: async () => [],
        connect: async () => void 0,
        call: async () => void 0,
    } as any;
}

(async () => {
    const fastify = Fastify({
        maxParamLength: 1000,
    });

    await fastify.register(FastifyCors, {
        origin: "*",
        methods: "GET",
    });

    routes.map(async (x) => await fastify.register(x.controller, { prefix: x.prefix }));

    try {
        fastify.get("/", (_, reply) => {
            reply.status(200).send("Welcome to Anify's authentication API. Please view https://docs.anify.tv for more information.");
        });

        fastify.get("/providers", (_, reply) => {
            reply.status(200).send(
                AUTH_PROVIDERS.map((x) => {
                    return {
                        id: x.id,
                        url: x.url,
                        name: x.name,
                        icon: x.icon,
                        oauth: x.oauthURL,
                    };
                })
            );
        });

        fastify.get("/user", async(request, reply) => {
            const { id } = request.query as { id: string };
            if (!id) return reply.status(400).send({ error: "No user ID provided." });

            const data = await fetchUser(id);
            return reply.status(200).send(data);
        })

        fastify.post("/user", async(request, reply) => {
            const { id } = request.body as { id: string };
            if (!id) return reply.status(400).send({ error: "No user ID provided." });

            const data = await fetchUser(id);
            return reply.status(200).send(data);
        })

        fastify.post("/create-user", async(request, reply) => {
            const { username, password, anilistId, malId, simklId } = request.body as { username: string, password: string, anilistId?: string, malId?: string, simklId?: string };
            
            if (!username) return reply.status(400).send({ error: "No username provided." });
            if (!password) return reply.status(400).send({ error: "No password provided." });

            const passData = await hashPassword(password);

            const data = await insertUser({ anilistId, malId, simklId }, username, passData.password, passData.salt);
            if (!data) return reply.status(400).send({ error: "User already exists." });

            return reply.status(200).send(data);
        })

        fastify.post("/login", async(request, reply) => {
            const { username, password } = request.body as { username: string, password: string };
            
            if (!username) return reply.status(400).send({ error: "No username provided." });
            if (!password) return reply.status(400).send({ error: "No password provided." });

            const data = await login(username, password);
            if (!data) return reply.status(400).send({ error: "Invalid username or password." });
            
            return reply.status(200).send(data);
        })

        fastify.post("/update-user", async(request, reply) => {
            const { id, anilistId, malId, simklId } = request.body as { id: string, anilistId?: string, malId?: string, simklId?: string };
            if (!id) return reply.status(400).send({ error: "No user ID provided." });

            const data = await updateUser(id, { anilistId, malId, simklId });
            return reply.status(200).send(data);
        })

        fastify.get("/settings", async(request, reply) => {
            const { id } = request.query as { id: string };
            if (!id) return reply.status(400).send({ error: "No user ID provided." });

            const settings = await redis.get(`settings:${id}`);
            if (!settings) return reply.status(404).send({ error: "Settings not found." });

            const data = await fetchSettings(id);
            await redis.set(`settings:${id}`, JSON.stringify(data), "EX", 60 * 60 * 24 * 7);
            return reply.status(200).send(data);
        })

        fastify.post("/settings", async(request, reply) => {
            const { id } = request.body as { id: string };
            if (!id) return reply.status(400).send({ error: "No user ID provided." });

            const settings = await redis.get(`settings:${id}`);
            if (!settings) return reply.status(404).send({ error: "Settings not found." });

            const data = await fetchSettings(id);
            await redis.set(`settings:${id}`, JSON.stringify(data), "EX", 60 * 60 * 24 * 7);
            return reply.status(200).send(data);
        })

        fastify.post("/update-settings", async(request, reply) => {
            const { id, settings } = request.body as { id: string, settings: Settings };
            if (!id) return reply.status(400).send({ error: "No user ID provided." });
            if (!settings) return reply.status(400).send({ error: "No settings provided." });

            const data = await updateSettings(id, settings);
            return reply.status(200).send(data);
        })

        fastify.get("*", (_, reply) => {
            reply.status(404).send({ error: "Page not found." });
        });

        fastify.listen({ port: env.PORT }, (e, address) => {
            if (e) throw e;
            console.log(colors.blue(`Server is now listening on ${address}`));
        });
    } catch (err) {
        fastify.log.error(err);
        process.exit(1);
    }
})().catch(console.error);
