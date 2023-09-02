import dotenv from "dotenv";
dotenv.config();

import colors from "colors";
import { execSync } from "child_process";

export const buildDb = async (): Promise<void> => {
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
};

buildDb();
