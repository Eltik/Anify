import { buildCommands, repositories } from "../../config";
import { exec } from "child_process";
import { promisify } from "util";
import { copyFileSync, createWriteStream, existsSync, mkdirSync } from "fs";

const execPromise = promisify(exec);

export default async function build(label: string, name: string[], count: number) {
    const data: { error?: any[]; data: any[] } = {
        error: undefined,
        data: [],
    };

    const repoNames = name.map((repoName) => repoName.replace(/ /g, "-"));

    const startTime = new Date();
    const startTimeMs = startTime.getTime();

    function timeFromStart() {
        return (new Date().getTime() - startTimeMs) / 1000;
    }

    try {
        if (!existsSync("builds")) mkdirSync("builds");

        const buildPath = `builds/${label}-${count}`;
        const logPath = `${buildPath}/logs`;

        if (existsSync(buildPath)) throw new Error(`Build already exists for ${label}`);
        mkdirSync(buildPath);
        mkdirSync(logPath);

        const logStream = createWriteStream(`${logPath}/build.log`, {});
        logStream.write(`Build started at ${startTime}\n`);

        const writeToLogStream = (output: any, repoName: string | unknown) => {
            const timeNow = timeFromStart().toFixed(2);
            const msg = `[${repoName} - ${timeNow}s] `;

            output?.split("\n").forEach((line: string) => {
                logStream?.write(msg + line + "\n");
            });
        };

        const promises = repoNames.map(async (repoName) => {
            const filteredRepos = repositories.filter((repo) => repo.name === repoName);
            if (filteredRepos.length !== 1) throw new Error(`Invalid repository name ${repoName}`);

            let output;
            const repo = filteredRepos[0];

            writeToLogStream(`Cloning ${repo.name}`, repo.name);
            let localCommand = `cd ${buildPath} && git clone ${repo.url} ${repo.name}`;

            output = await execPromise(localCommand, {});

            writeToLogStream(output.stdout, repo.name);
            writeToLogStream(output.stderr, repo.name);

            localCommand = `cd ${buildPath}/${repo.name} && npm install`;
            output = await execPromise(localCommand);

            writeToLogStream(output.stdout, repo.name);
            writeToLogStream(output.stderr, repo.name);

            const src = buildCommands[repo.name][".env"];
            writeToLogStream(src, repo.name);
            if (src) {
                const dest = `${buildPath}/${repo.name}/.env`;
                copyFileSync(src, dest);

                writeToLogStream(dest, repo.name);
            }

            localCommand = `cd ${buildPath}/${repo.name} && ${buildCommands[repo.name].command}`;
            output = await execPromise(localCommand);

            writeToLogStream(output.stdout, repo.name);
            writeToLogStream(output.stderr, repo.name);

            logStream.write(`Build finished at ${new Date()} and took ${timeFromStart()}s\n`);

            data.data.push({
                [repoName]: "success",
            });
        });

        await Promise.all(promises);
    } catch (error) {
        const errorMessage = (error as any).message || error;
        console.error(`buildRepo error: ${errorMessage}`);
        data.error = [{ message: errorMessage }];
    }

    return data;
}
