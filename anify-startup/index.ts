import { spawn, ChildProcess } from "child_process";
import { join } from "path";
import colors from "colors";

const directories = [
    join(import.meta.dir, "../anify-frontend"),
    join(import.meta.dir, "../anify-backend"),
    join(import.meta.dir, "../anify-auth"),
];

const runningProcesses = new Map<string, ChildProcess>();

async function startProcesses() {
    for (const directory of directories) {
        const childProcess = spawn("pnpm", ["run", "dev"], {
            cwd: directory,
            detached: true,
        });

        childProcess.stdout.on("data", (data) => {
            console.log(colors.green(`[${directory}]`), data.toString());
        });

        childProcess.stderr.on("data", (data) => {
            console.log(colors.red(`[${directory}]`), data.toString());
        });

        childProcess.unref();

        runningProcesses.set(directory, childProcess);
    }

    colors.green("Started services");
}

async function stopProcesses() {
    for (const directory of directories) {
        console.log(runningProcesses.get(directory)?.pid);
        runningProcesses.get(directory)?.kill();
    }

    runningProcesses.clear();

    /*
    // Run killall node
    await new Promise((resolve, reject) => {
        spawn("killall", ["node"]).on("exit", () => {
            resolve(true);
        }).on("error", (err) => {
            reject(err);
        });
    });
    */
}

startProcesses().then(() => {
    console.log(colors.green("Started services"));
    // Hang the process
    setInterval(() => {}, 1000);
}).catch((err) => {
    console.error(colors.red("Error: "), err);
});

process.on("beforeExit", async () => {
    console.log(colors.red("Stopping services..."));
    await stopProcesses().catch((err) => {
        console.error(colors.red("Error: "), err);
    });
});

process.on("unhandledRejection", (err) => {
    console.error(colors.red("Unhandled Promise rejection: "), err);
});

process.on("SIGINT", async () => {
    console.log(colors.red("Stopping services..."));
    await stopProcesses().catch((err) => {
        console.error(colors.red("Error: "), err);
    });
    process.exit();
});