import { z } from "zod";
import { createEnv } from "@t3-oss/env-nextjs";

export const env = createEnv({
    server: {
        DATABASE_URL: z.string().url(),
        BACKEND_URL: z.string().url(),
        AUTH_URL: z.string().url(),
        M3U8_PROXY: z.string().url(),
        IMAGE_PROXY: z.string().url(),
        API_KEY: z.string(),
        NODE_ENV: z.enum(["development", "test", "production"]),
    },

    client: {
        NEXT_PUBLIC_IMAGE_PROXY: z.string().url(),
    },

    runtimeEnv: {
        DATABASE_URL: process.env.DATABASE_URL || "file:./db.sqlite",
        BACKEND_URL: process.env.BACKEND_URL || "http://localhost:3060",
        AUTH_URL: process.env.AUTH_URL || "http://localhost:3660",
        M3U8_PROXY: process.env.M3U8_PROXY || "https://proxy.m3u8.proxy",
        IMAGE_PROXY: process.env.IMAGE_PROXY || "https://api.consumet.org/utils/image-proxy",
        API_KEY: process.env.API_KEY || "myapikey",
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_IMAGE_PROXY: process.env.IMAGE_PROXY || "https://api.consumet.org/utils/image-proxy",
    },
    skipValidation: !!process.env.SKIP_ENV_VALIDATION,
    emptyStringAsUndefined: true,
});
