// All environment variables.
export const env = {
    PORT: Number(process.env.PORT) || 3000,
    NINEANIME_RESOLVER: process.env.NINEANIME_RESOLVER,
    NINEANIME_KEY: process.env.NINEANIME_KEY,
    REDIS_URL: process.env.REDIS_URL,
    REDIS_CACHE_TIME: Number(process.env.REDIS_CACHE_TIME) || 60 * 60 * 24 * 7,
    CENSYS_ID: process.env.CENSYS_ID,
    CENSYS_SECRET: process.env.CENSYS_SECRET,
    SIMKL_CLIENT_ID: process.env.SIMKL_CLIENT_ID,
    USE_MIXDROP: process.env.USE_MIXDROP === "true" || false,
    MIXDROP_EMAIL: process.env.MIXDROP_EMAIL,
    MIXDROP_KEY: process.env.MIXDROP_KEY,
};
