import dotenv from "dotenv";
dotenv.config();

import colors from "colors";
import { env } from "../env";
const recommendedVariables = ["REDIS_URL", "REDIS_CACHE_TIME", "CENSYS_ID", "CENSYS_SECRET"];

let databaseType: "postgres" | null = "postgres";

if (env.DATABASE_TYPE) {
    databaseType = env.DATABASE_TYPE === "postgres" ? "postgres" : null;
    if (!databaseType) {
        console.log(colors.yellow("WARNING: Invalid database type provided. Please check .env.example."));
        databaseType = "postgres";
    }
}

if (databaseType === "postgres") {
    const requiredVariables = ["DATABASE_URL"];
    for (const variable of requiredVariables) {
        if (!env[variable as keyof typeof env]) {
            throw new Error(colors.red(`Missing environment variable ${variable}`));
        }
    }
}

for (const variable of recommendedVariables) {
    if (!env[variable as keyof typeof env]) {
        console.log(colors.yellow(`WARNING: Enviornment variable ${variable} not found.`));
    }
}
