/* eslint-disable @typescript-eslint/no-var-requires */
// @ts-check

/**
 * Run `build` or `dev` with `SKIP_ENV_VALIDATION` to skip env validation.
 * This is especially useful for Docker builds.
 */
import withPWA from "next-pwa";

!process.env.SKIP_ENV_VALIDATION && (await import("./src/env.mjs"));

/** @type {import("next").NextConfig} */
const config = {
    reactStrictMode: false,

    /**
     * If you have the "experimental: { appDir: true }" setting enabled, then you
     * must comment the below `i18n` config out.
     *
     * @see https://github.com/vercel/next.js/issues/41980
     */
    i18n: {
        locales: ["en"],
        defaultLocale: "en",
    },
    webpack: (config) => {
        config.resolve.fallback = { fs: false, path: false };

        return config;
    },
    async redirects() {
        return [
            {
                source: "/discord",
                destination: "https://discord.gg/zBCvFken5W",
                permanent: false,
                basePath: false,
            },
            {
                source: "/donate",
                destination: "https://ko-fi.com/anify",
                permanent: false,
                basePath: false,
            },
        ];
    },
    images: {
        remotePatterns: [
            {
                protocol: "https",
                hostname: "**.*.*",
            },
            {
                protocol: "https",
                hostname: "**.**.*.*",
            },
        ],
    },
};

export default withPWA({
    dest: "public",
})(config);
