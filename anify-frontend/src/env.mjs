import { z } from "zod";
import { createEnv } from "@t3-oss/env-nextjs";

export const env = createEnv({
    /**
     * Specify your server-side environment variables schema here. This way you can ensure the app
     * isn't built with invalid env vars.
     */
    server: {
        DATABASE_URL: z.string().url(),
        BACKEND_URL: z.string().url(),
        AUTH_URL: z.string().url(),
        M3U8_PROXY: z.string().url(),
        IMAGE_PROXY: z.string().url(),
        API_KEY: z.string(),
        NODE_ENV: z.enum(["development", "test", "production"]),
    },

    /**
     * Specify your client-side environment variables schema here. This way you can ensure the app
     * isn't built with invalid env vars. To expose them to the client, prefix them with
     * `NEXT_PUBLIC_`.
     */
    client: {
        // NEXT_PUBLIC_CLIENTVAR: z.string().min(1),
        NEXT_PUBLIC_IMAGE_PROXY: z.string().url()
    },

    /**
     * You can't destruct `process.env` as a regular object in the Next.js edge runtimes (e.g.
     * middlewares) or client-side so we need to destruct manually.
     */
    runtimeEnv: {
        DATABASE_URL: process.env.DATABASE_URL || "file:./db.sqlite",
        BACKEND_URL: process.env.BACKEND_URL || "http://localhost:3060",
        AUTH_URL: process.env.AUTH_URL || "http://localhost:3660",
        M3U8_PROXY: process.env.M3U8_PROXY || "https://proxy.m3u8.proxy",
        IMAGE_PROXY: process.env.IMAGE_PROXY || "https://api.consumet.org/utils/image-proxy",
        API_KEY: process.env.API_KEY || "",
        NODE_ENV: process.env.NODE_ENV,
        NEXT_PUBLIC_IMAGE_PROXY: process.env.IMAGE_PROXY || "https://api.consumet.org/utils/image-proxy"
    },
});
