import { redis } from "..";

// Middleware to implement rate limiting.
export const rateLimitMiddleware = async (req: Request): Promise<{ ip: string; timestamp: number; requests: number }> => {
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
