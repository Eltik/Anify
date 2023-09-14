import { runCommands } from "../../config";
import { promisify } from "util";
import fs from "fs";
import pm2 from "pm2";
import init from "./init";

interface BuildDetail {
    error?: string;
    data?: string;
}

const run = async (folderName: string): Promise<BuildDetail[]> => {
    await init();

    const builds = (await promisify(fs.readdir)("./builds")) as any[];
    const buildStats = await Promise.all(builds.map((build) => promisify(fs.stat)(`./builds/${build}`)));
    const latestBuild = folderName ?? builds[buildStats.filter((stat: any) => stat.isDirectory()).length - 1];

    const keys = Object.keys(runCommands);
    const buildDetails: BuildDetail[] = [];

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];
        const value = runCommands[key];

        await new Promise<void>((resolve, reject) => {
            pm2.start(
                {
                    script: `pnpm`,
                    args: value.split(" "),
                    cwd: `./builds/${latestBuild}/${key}`,
                    name: latestBuild + "-" + key,
                },
                (err, apps) => {
                    if (err) {
                        console.log(err);
                        buildDetails.push({ error: err.message });
                    } else {
                        buildDetails.push({ data: `running ${latestBuild}, ${key}` });
                    }

                    resolve();
                }
            );
        });
    }

    return buildDetails;
};

export default run;
