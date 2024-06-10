import { redis } from "..";
import { updateKey } from "../../database/impl/keys/updateKey";
import emitter, { Events } from "../../lib";

// Middleware to implement rate limiting.
export const apiKeyMiddleware = async (req: Request): Promise<boolean> => {
    //const userAgent = req.headers.get("User-Agent") ?? "unknown";
    const key = new URL(req.url).searchParams.get("apikey");

    if (!(await redis.sismember(`apikeys`, key ?? "unknown"))) {
        return false;
    }

    return true;
};

export const rateLimitApiKeyMiddleware = async (req: Request): Promise<boolean> => {
    const key = new URL(req.url).searchParams.get("apikey");
    if (!key) return false;
    const redisKey = await redis.get(`apikey:${key}`);
    if (redisKey) {
        try {
            const data = JSON.parse(redisKey);
            const requests = data.requestCount;
            await redis.set(`apikey:${key}`, Number(redisKey) + 1);

            if (new Date(data.updatedAt).getTime() + 18000 < Date.now()) {
                // 5 hours
                Object.assign(data, {
                    updatedAt: new Date().getTime(),
                    requestCount: requests + 1,
                });

                console.log("Updating key", key, "with new data.");

                await emitter.emit(Events.KEY_UPDATE, data);

                await updateKey(data);
                await redis.set(`apikey:${key}`, data);

                return true;
            }

            if (redisKey && Number(data.requestCount) >= 10000 && Number(data.requestCount) < 100000 + 10) {
                console.log("Rate limit reached for key", key);

                await emitter.emit(Events.KEY_LIMIT_REACHED, data);

                //await redis.del(`apikey:${key}`);
                return false;
            }
        } catch (e) {
            //
        }
    }

    return false;
};
