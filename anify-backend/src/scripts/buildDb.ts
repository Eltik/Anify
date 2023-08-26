import dotenv from "dotenv";
dotenv.config();

import colors from "colors";
import { execSync } from "child_process";
import { env } from "../env";
import Database from "../database";

let databaseType: "postgres" | "meilisearch" | null = "postgres";

if (env.DATABASE_TYPE) {
    databaseType = env.DATABASE_TYPE === "postgres" ? "postgres" : env.DATABASE_TYPE === "meilisearch" ? "meilisearch" : null;
    if (!databaseType) {
        console.log(colors.yellow("WARNING: Invalid database type provided. Set to postgres. Please check .env.example."));
        databaseType = "postgres";
    }
}

if (databaseType === "postgres") {
    const scripts = ["npm run db:generate && npm run db:push && npm run db:validate"];

    for (const script of scripts) {
        try {
            console.log(`Executing script: ${script}`);
            execSync(script, { stdio: "inherit" });
        } catch (error) {
            console.error(colors.red(`Error executing script: ${script}`));
            console.error(error);
        }
    }
    
    Database.initializeDatabase().then(() => {
        console.log(colors.green("Initialized database!"));
    })
}
