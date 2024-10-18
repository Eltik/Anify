// All environment variables.
export const env = {
    PORT: Number(process.env.PORT ?? 3000),
    DATABASE_URL: process.env.DATABASE_URL ?? "",
    NOVELUPDATES_LOGIN: process.env.NOVELUPDATES_LOGIN,
    REDIS_URL: process.env.REDIS_URL,
    REDIS_CACHE_TIME: Number(process.env.REDIS_CACHE_TIME ?? 60 * 60 * 24 * 7),
    CENSYS_ID: process.env.CENSYS_ID,
    CENSYS_SECRET: process.env.CENSYS_SECRET,
    USE_MIXDROP: process.env.USE_MIXDROP === "true" || false,
    MIXDROP_EMAIL: process.env.MIXDROP_EMAIL,
    MIXDROP_KEY: process.env.MIXDROP_KEY,
};
