import { execSync } from "child_process";
import { dbType } from "../database";

export const buildDB = async () => {
    if (dbType === "postgresql") {
        const scripts = ["bunx prisma db push", "bunx prisma generate", "bunx prisma validate"];

        for (const script of scripts) {
            try {
                console.log(`Executing script: ${script}`);
                execSync(script, { stdio: "inherit" });
            } catch (error) {
                console.error(error);
            }
        }
    }
};

buildDB();