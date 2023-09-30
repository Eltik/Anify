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

            writeToLogStream(localCommand, repo.name);

            output = await execPromise(localCommand, {});

            writeToLogStream("Cloning finished", repo.name);

            writeToLogStream(output.stdout, repo.name);
            writeToLogStream(output.stderr, repo.name);

            localCommand = `cd ${buildPath}/${repo.name} && bun install`;
            output = await execPromise(localCommand);

            writeToLogStream(output.stdout, repo.name);
            writeToLogStream(output.stderr, repo.name);

            const backend = buildCommands[repo.name].backendEnv;
            const proxies = buildCommands[repo.name].proxies;
            const backendFolder = buildCommands[repo.name].backendFolder;
            const frontend = buildCommands[repo.name].frontendEnv;
            const frontendFolder = buildCommands[repo.name].frontendFolder;
            const auth = buildCommands[repo.name].authEnv;
            const authFolder = buildCommands[repo.name].authFolder;

            if (buildCommands[repo.name].copyProxies && backendFolder && proxies) {
                const dest = [`${buildPath}/${repo.name}/${backendFolder}/animeProxies.json`, `${buildPath}/${repo.name}/${backendFolder}/baseProxies.json`, `${buildPath}/${repo.name}/${backendFolder}/mangaProxies.json`, `${buildPath}/${repo.name}/${backendFolder}/metaProxies.json`, `${buildPath}/${repo.name}/${backendFolder}/proxies.json`];
                try {
                    for (let i = 0; i < dest.length; i++) {
                        copyFileSync(proxies[i], dest[i]);
                    }
                } catch (error) {
                    const errorMessage = (error as any).message || error;
                    console.error(`buildRepo error: ${errorMessage}`);
                    console.log(backend, dest);

                    writeToLogStream(errorMessage, repo.name);
                }

                writeToLogStream(dest, repo.name);
            }

            writeToLogStream(backend, repo.name);

            if (backend && backendFolder) {
                const dest = `${buildPath}/${repo.name}/${backendFolder}/.env`;
                try {
                    copyFileSync(backend, dest);
                } catch (error) {
                    const errorMessage = (error as any).message || error;
                    console.error(`buildRepo error: ${errorMessage}`);
                    console.log(backend, dest);

                    writeToLogStream(errorMessage, repo.name);
                }

                writeToLogStream(dest, repo.name);
            }

            writeToLogStream(frontend, repo.name);
            if (frontend && frontendFolder) {
                const dest = `${buildPath}/${repo.name}/${frontendFolder}/.env`;
                try {
                    copyFileSync(frontend, dest);
                } catch (error) {
                    const errorMessage = (error as any).message || error;
                    console.error(`buildRepo error: ${errorMessage}`);
                    console.log(frontend, dest);

                    writeToLogStream(errorMessage, repo.name);
                }

                writeToLogStream(dest, repo.name);
            }

            writeToLogStream(auth, repo.name);
            if (auth && authFolder) {
                const dest = `${buildPath}/${repo.name}/${authFolder}/.env`;
                try {
                    copyFileSync(auth, dest);
                } catch (error) {
                    const errorMessage = (error as any).message || error;
                    console.error(`buildRepo error: ${errorMessage}`);
                    console.log(auth, dest);

                    writeToLogStream(errorMessage, repo.name);
                }

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

        return data;
    } catch (error) {
        const errorMessage = (error as any).message || error;
        console.error(`buildRepo error: ${errorMessage}`);
        data.error = [{ message: errorMessage }];

        return data;
    }
}
