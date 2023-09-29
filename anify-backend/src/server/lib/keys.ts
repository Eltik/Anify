import { redis } from "..";

// Middleware to implement rate limiting.
export const apiKeyMiddleware = async (req: Request): Promise<boolean> => {
    const userAgent = req.headers.get("User-Agent") ?? "unknown";
    const key = new URL(req.url).searchParams.get("apikey");

    if (userAgent != "consumet" && !(await redis.sismember(`apikeys`, key ?? "unknown"))) {
        return false;
    }

    return true;
};
