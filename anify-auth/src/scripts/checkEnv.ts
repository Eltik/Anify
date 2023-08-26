import dotenv from "dotenv";
dotenv.config();

import colors from "colors";
import { env, providerEnv } from "../env";

const recommendedVariables = ["REDIS_URL", "REDIS_CACHE_TIME"].concat(Object.keys(providerEnv));

const requiredVariables = ["DATABASE_URL"];
for (const variable of requiredVariables) {
    if (!env[variable]) {
        throw new Error(colors.red(`Missing environment variable ${variable}`));
    }
}

for (const variable of recommendedVariables) {
    if (!env[variable]) {
        console.log(colors.yellow(`WARNING: Enviornment variable ${variable} not found.`));
    }
}
