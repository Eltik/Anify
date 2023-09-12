import fs from "fs";
import path from "path";

import { repositories, buildCommands } from "../../config";

interface Health {
    file: string;
    path: string;
    status: "healthy" | "unhealthy" | "unknown";
    errors: {
        reason: string;
        raw?: any;
    }[];
}

const viewBuilds = async () => {
    const healthCollection = new Map<string, Health>();

    try {
        const files = await fs.promises.readdir("./builds");

        for (const file of files) {
            const subFiles = await fs.promises.readdir(`./builds/${file}`);
            const health: Health = {
                status: "healthy",
                file,
                path: `./builds/${file}`,
                errors: [],
            };

            if (subFiles.length !== repositories.length + 1) {
                health.status = "unhealthy";
                health.errors.push({
                    reason: "Missing files",
                });
            }

            const data = await fs.promises.readFile(`./builds/${file}/logs/build.log`);
            const dataString = data.toString();

            if (dataString.includes("error")) {
                health.status = "unknown";
                health.errors.push({
                    reason: "Error in build.log - 'error' found",
                    raw: `if (dataString.includes("error")) {`,
                });
            } else if (!dataString.match(/Build finished at .+/g)) {
                health.status = "unhealthy";
                health.errors.push({
                    reason: "Error in build.log - no build finished at",
                    raw: `!dataString.match( /Build finished at .+/g )`,
                });
            }

            for (const repo of repositories) {
                const repoPath = path.join(`./builds/${file}`, repo.name);
                if (!fs.existsSync(repoPath)) {
                    health.errors.push({
                        reason: `Missing repo ${repo.name}`,
                    });
                    continue;
                }

                const repositoryFiles = await fs.promises.readdir(repoPath);
                if (buildCommands[repo.name][".env"]) {
                    if (!repositoryFiles.includes(".env")) {
                        health.errors.push({
                            reason: `Missing .env in ${repo.name}`,
                            raw: `if (buildCommands[repo.name][".env"]) {`,
                        });
                    }
                }
                if (!repositoryFiles.includes("node_modules")) {
                    health.errors.push({
                        reason: `Missing node_modules in ${repo.name}`,
                        raw: `if (!repositoryFiles.includes("node_modules")) {`,
                    });
                }
            }

            healthCollection.set(file, health);
        }

        return healthCollection;
    } catch (err) {
        console.error(err);
    }
};

export default viewBuilds;
export { viewBuilds };

export { Health };
