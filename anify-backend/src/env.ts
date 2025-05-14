import * as dotenv from "dotenv";
import { z } from "zod";
import fs from "node:fs";
import path from "node:path";

const booleanFromEnv = z.string().transform((val) => {
    const normalized = val.toLowerCase().trim();

    if (["true", "1", "yes", "on"].includes(normalized)) return true;

    if (["false", "0", "no", "off"].includes(normalized)) return false;

    throw new Error(`Invalid boolean value: "${val}". Expected true/1/yes/on or false/0/no/off`);
});

/**
 * @description Define the schema for the environment variables.
 */
const envSchema = z.object({
    /**
     * @description Basic environment variables
     */
    /**
     * The environment to run the server in.
     */
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    /**
     * Whether the server is running in a GitHub Actions workflow.
     */
    IS_WORKFLOW: booleanFromEnv.optional().default("false"),
    /**
     * The port to run the server on.
     */
    PORT: z.string().regex(/^\d+$/).transform(Number).default("3000"),
    /**
     * The URL of the database to connect to.
     */
    DATABASE_URL: z.string().url(),
    /**
     * The URL of the Redis server to connect to.
     */
    REDIS_URL: z.string().url(),
    /**
     * The time in seconds to cache data in Redis.
     */
    REDIS_CACHE_TIME: z.string().regex(/^\d+$/).transform(Number).default("604800"),
    /**
     * Whether to enable debug mode.
     */
    DEBUG: booleanFromEnv.optional().default("false"),

    /**
     * @description Optional, but highly recommended as
     * Censys is used for scraping proxies.
     */
    /**
     * The API ID for the Censys API.
     */
    CENSYS_API_ID: z.string().optional(),
    /**
     * The API key for the Censys API.
     */
    CENSYS_API_SECRET: z.string().optional(),

    /**
     * @description Webshare environment variables
     */
    /**
     * Whether to use Webshare.
     */
    USE_WEBSHARE: booleanFromEnv.optional().default("false"),
    /**
     * The Webshare API key.
     */
    WEBSHARE_API_KEY: z.string().optional(),

    /**
     * @description Optional, additional environment variables
     */
    /**
     * Whether to use Mixdrop for fetching videos.
     */
    USE_MIXDROP: booleanFromEnv.optional().default("false"),
    /**
     * Mixdrop email for fetching videos.
     */
    MIXDROP_EMAIL: z.string().optional(),
    /**
     * Mixdrop key for fetching videos.
     */
    MIXDROP_KEY: z.string().optional(),
    /**
     * Whether to enable proxy rotation.
     */
    PROXY_CRON_ENABLED: booleanFromEnv.optional().default("false"),

    /**
     * @description Environment variables for mapping providers.
     */
    NOVELUPDATES_LOGIN: z.string().optional(),

    /**
     * @description Environment variables for Cloudflare Proxy.
     */
    /**
     * The URL of the Cloudflare Proxy.
     */
    CLOUDFLARE_PROXY_URL: z.string().url().optional(),
    /**
     * The full proxy access URL.
     */
    FULL_PROXY_ACCESS_URL: z.string().url().optional(),
});

/**
 * @description Set the file path for the `.env` file.
 */
const ENV_FILE_PATH = path.resolve(process.cwd(), ".env");

/**
 * @description Load and parse the `.env` file
 */
dotenv.config({ path: ENV_FILE_PATH });

/**
 * @description Preprocess environment variables to remove semicolons.
 */
const cleanEnvironmentVariables = (env: NodeJS.ProcessEnv) => {
    const cleanedEnv: Record<string, string> = {};
    for (const [key, value] of Object.entries(env)) {
        if (value) {
            let cleaned = value.trim();

            // Remove trailing semicolon
            cleaned = cleaned.replace(/;$/, "");

            // If the entire string is wrapped in quotes (""), remove them
            if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
                cleaned = cleaned.slice(1, -1);
            } else if (cleaned.startsWith("'") && cleaned.endsWith("'")) {
                cleaned = cleaned.slice(1, -1);
            }

            cleanedEnv[key] = cleaned;
        }
    }
    return cleanedEnv;
};

const cleanedEnv = cleanEnvironmentVariables(process.env);

/**
 * @description Generate a default `.env` file if missing
 */
const generateEnvFile = () => {
    if (!fs.existsSync(ENV_FILE_PATH)) {
        const defaultValues = Object.entries(envSchema.shape).map(([key, schema]) => {
            const defaultValue = schema instanceof z.ZodDefault ? schema._def.defaultValue() : undefined;
            return `${key}=${defaultValue ?? ""}`;
        });
        fs.writeFileSync(ENV_FILE_PATH, defaultValues.join("\n"));
        console.log(`Generated default .env file at ${ENV_FILE_PATH}`);
    }
};

generateEnvFile();

/**
 * @description Validate and parse environment variables.
 */
const parsedEnv = envSchema.safeParse(cleanedEnv);

if (!parsedEnv.success) {
    console.error("Invalid environment variables:", parsedEnv.error.format());
    process.exit(1);
}

/**
 * @description Extract validated variables.
 */
const env = parsedEnv.data;
export { env };
