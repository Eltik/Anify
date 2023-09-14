import { buildCommands, repositories } from "../../config";
import fs from "fs";
import { exec, ChildProcess } from "child_process";
import { promisify } from "util";
import { copyFileSync, createWriteStream, existsSync, mkdirSync } from "fs";

const execPromise = promisify(exec);

const customPromisify = (
    localCommand: string
): {
    promise: Promise<number>;
    child: ChildProcess;
} => {
    const child = exec(localCommand);
    const promise = new Promise<number>((resolve, reject) => {
        child.on("error", reject);
        child.on("exit", resolve);
        child.on("close", resolve);
    });

    return {
        promise,
        child,
    };
};

export default async function update({ label = "auto", name = Object.keys(buildCommands) }: { label?: string; name?: string[] }) {
    const data: { error?: any[]; data: any[] } = {
        error: undefined,
        data: [],
    };

    const repoNames = name?.map((repoName) => repoName.replace(/ /g, "-"));

    const startTime = new Date();
    const startTimeMs = startTime.getTime();

    function timeFromStart() {
        return (new Date().getTime() - startTimeMs) / 1000;
    }

    try {
        const buildPath = `builds/${label}`;
        const logPathPartial = `${buildPath}/logs`;
        const logPath = `${logPathPartial}/update-${new Date().toDateString().split(" ").join("-")}.log`;
        let firstBuild = false;

        if (!existsSync(buildPath)) {
            firstBuild = true;
            mkdirSync(buildPath);
            mkdirSync(logPathPartial);
        }

        // get the latest commit hash
        const logStream = createWriteStream(`${logPath}`, {});
        logStream.write(`Update started at ${startTime}\n`);

        const writeToLogStream = (output: any, repoName: string | unknown) => {
            const timeNow = timeFromStart().toFixed(2);
            const msg = `[${repoName} - ${timeNow}s] `;

            output?.split("\n").forEach((line: string) => {
                logStream?.write(msg + line + "\n");
                console.log(msg + line);
            });
        };

        const promises = repoNames?.map(async (repoName) => {
            const filteredRepos = repositories.filter((repo) => repo.name === repoName);
            if (filteredRepos.length !== 1) throw new Error(`Invalid repository name ${repoName}`);

            let output;
            const repo = filteredRepos[0];

            writeToLogStream(`Updating ${repo.name}`, repo.name);
            let localCommand: any;

            if (firstBuild) {
                localCommand = `cd ${buildPath} && git clone ${repo.url} ${repo.name}`;
                output = await execPromise(localCommand);

                writeToLogStream(output.stdout, repo.name);
                writeToLogStream(output.stderr, repo.name);
            }

            localCommand = `cd ${buildPath}/${repo.name} && git pull`;
            output = customPromisify(localCommand);

            output.child.stdout?.on("data", (d) => writeToLogStream(d, repo.name));
            output.child.stderr?.on("data", (d) => writeToLogStream(d, repo.name));

            await output.promise;

            localCommand = `cd ${buildPath}/${repo.name} && pnpm install`;
            output = customPromisify(localCommand);

            output.child.stdout?.on("data", (d) => writeToLogStream(d, repo.name));
            output.child.stderr?.on("data", (d) => writeToLogStream(d, repo.name));

            await output.promise;

            const src = buildCommands[repo.name][".env"];
            writeToLogStream(src, repo.name);
            if (src) {
                const dest = `${buildPath}/${repo.name}/.env`;
                copyFileSync(src, dest);

                writeToLogStream(dest, repo.name);
            }

            localCommand = `cd ${buildPath}/${repo.name} && ${buildCommands[repo.name].command}`;
            output = customPromisify(localCommand);

            output.child.stdout?.on("data", (d) => writeToLogStream(d, repo.name));
            output.child.stderr?.on("data", (d) => writeToLogStream(d, repo.name));

            await output.promise;

            logStream.write(`Build finished at ${new Date()} and took ${timeFromStart()}s\n`);

            data.data.push({
                [repoName]: "success",
            });
        });

        data.data.push({
            logsPath: logPath,
        });

        await Promise.all(promises);

        // we assume a victroy so now run fs.utimesSync( path, atime, mtime ) on the buildFolder
        const newTime = new Date();
        fs.utimesSync(buildPath, newTime, newTime);
    } catch (error: any) {
        const errorMessage = error.message || error;
        console.error(`buildRepo error: ${errorMessage}`);
        data.error = [{ message: errorMessage }];
    }
    return data;
}
