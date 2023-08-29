// All environment variables.
export const env = {
    PORT: Number(process.env.PORT) || 3000,
    BACKEND_URL: process.env.BACKEND_URL,
    FRONTEND_URL: process.env.FRONTEND_URL,
    BACKEND_KEY: process.env.BACKEND_KEY ?? "",
    DATABASE_URL: process.env.DATABASE_URL,
    REDIS_URL: process.env.REDIS_URL,
    REDIS_CACHE_TIME: Number(process.env.REDIS_CACHE_TIME) || 60 * 60 * 24 * 7
};

export const providerEnv = {
    PUBLIC_URL: process.env.PUBLIC_URL || `http://localhost:${process.env.PORT || 3000}`,
    ANILIST_CLIENT_ID: process.env.ANILIST_CLIENT_ID ?? "",
    ANILIST_CLIENT_SECRET: process.env.ANILIST_CLIENT_SECRET ?? "",
    MAL_CLIENT_ID: process.env.MAL_CLIENT_ID ?? "",
    MAL_CLIENT_SECRET: process.env.MAL_CLIENT_SECRET ?? "",
    SIMKL_CLIENT_ID: process.env.SIMKL_CLIENT_ID ?? "",
    SIMKL_CLIENT_SECRET: process.env.SIMKL_CLIENT_SECRET ?? "",
};
