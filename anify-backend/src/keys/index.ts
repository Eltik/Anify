import crypto from "crypto";
import { Redis } from "ioredis";
import Database from "../database";
import colors from "colors";
import { env } from "../env";
import { execSync } from "child_process";

let redis = new Redis((env.REDIS_URL as string) || "redis://localhost:6379");

if (!env.REDIS_URL) {
    redis = {
        get: async () => null,
        set: (): Promise<"OK"> => Promise.resolve("OK"),
        on: () => Redis.prototype,
        keys: async () => [],
        connect: async () => void 0,
        call: async () => void 0,
        sadd: async () => 0,
        sismember: async () => 0,
    } as any;
}

const shouldUseKeys = env.USE_API_KEYS;

export const masterKey: string | null = env.MASTER_KEY || null;

export const createKey = async () => {
    const uniqueKey = crypto.randomBytes(16).toString("hex");

    await Database.createAPIKey(uniqueKey);

    await redis.sadd("apikeys", uniqueKey);

    return uniqueKey;
};

export const importKeys = async () => {
    const keys = await Database.fetchAPIKeys();

    if (masterKey && !keys.includes(masterKey)) keys.push(masterKey);

    for (const key of keys) {
        const requests = await getRequests(key);
        console.log(colors.blue(key) + " - " + colors.blue(requests + "") + " requests");

        if (await redis.sismember("apikeys", key)) continue;
        await redis.sadd("apikeys", key);
    }
};

export const flushSafely = async () => {
    // Execute command redis-cli flushall
    //await redis.call("flushall");
    const scripts = ["redis-cli flushall"];

    for (const script of scripts) {
        try {
            console.log(`Executing script: ${script}`);
            execSync(script, { stdio: "inherit" });
        } catch (error) {
            console.error(colors.red(`Error executing script: ${script}`));
            console.error(error);
        }
    }

    await importKeys();
};

export async function checkAPIKey(req, res, next) {
    if (shouldUseKeys === "true") {
        try {
            if (req.query.apikey) {
                const key = req.query.apikey;

                if (shouldUseKeys === "true" && (await redis.sismember("apikeys", key))) {
                    // Increment the request count for the API key in Redis
                    await increaseRequests(key);

                    // Continue processing the request
                    next();
                } else {
                    res.json({ error: "Invalid API key." });
                }
            } else {
                res.json({ error: "No API key provided." });
            }
        } catch (err) {
            res.json({ error: "An unexpected error occurred." });
        }
    } else {
        next();
    }
}

export async function increaseRequests(key: string): Promise<void> {
    await redis.incr(`apikey:${key}`);
}

export async function getRequests(key: string): Promise<number> {
    return Number(await redis.get(`apikey:${key}`));
}

export async function updateRequests(): Promise<void> {
    const keys = await Database.fetchAPIKeys();
    for (const key of keys) {
        const requests = await getRequests(key);
        if (!requests || isNaN(requests)) continue;

        await Database.updateKeyRequests(key, requests);

        await redis.del(`apikey:${key}`).catch((err) => {
            console.log(colors.red("Error deleting key ") + key + colors.red(" from cache."));
        });

        console.log(colors.green("Updated key ") + key + colors.green("."));
    }
}
