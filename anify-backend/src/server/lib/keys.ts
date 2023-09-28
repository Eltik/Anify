import { redis } from "..";

// Middleware to implement rate limiting.
export const apiKeyMiddleware = async (req: Request): Promise<boolean> => {
    const key = new URL(req.url).searchParams.get("apikey");

    if (!(await redis.sismember(`apikeys`, key ?? "unknown"))) {
        return false;
    }

    return true;
};
