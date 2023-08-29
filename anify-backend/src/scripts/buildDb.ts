import dotenv from "dotenv";
dotenv.config();

import colors from "colors";
import { execSync } from "child_process";
import Database from "../database";

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
});
