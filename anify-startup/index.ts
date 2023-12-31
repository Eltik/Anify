import pm2 from "pm2";
import colors from "colors";

const frontendConfig = {
    name: "anify-frontend",
    script: "cd ../anify-frontend && bun start",
    autorestart: true,
    watch: false,
    max_memory_restart: "1G"
};

const backendConfig = {
    name: "anify-backend",
    script: "cd ../anify-backend && bun start",
    autorestart: true,
    watch: false,
    max_memory_restart: "1G"
};

const configs = [frontendConfig, backendConfig];

async function readEnv(process: Process): Promise<string | undefined> {
    const env = Bun.file(`../${process}/.env`);
    if (await env.exists()) {
        const data = await env.text();

        // Return as JSON like { "key": "value" }
        const result: { [key: string]: string } = {};
        data.split("\n").forEach((line) => {
            const [key, value] = line.split("=");
            result[key] = value;
        });

        return JSON.stringify(result);
    } else return undefined;
}

async function start() {
    /*
    const backendEnv = await readEnv(Process.BACKEND);
    if (backendEnv) Object.assign(backendConfig, { env: backendEnv });

    const frontendEnv = await readEnv(Process.FRONTEND);
    if (frontendEnv) Object.assign(frontendConfig, { env: frontendEnv });

    const authEnv = await readEnv(Process.AUTH);
    if (authEnv) Object.assign(authenticationConfig, { env: authEnv });
    */

    await new Promise((resolve, reject) => {
        pm2.connect((error) => {
            if (error) reject(error);
            else resolve(true);
        });
    });

    await Promise.all(configs.map((config) => new Promise((resolve, reject) => {
        pm2.start(config, (error) => {
            if (error) reject(error);
            else resolve(true);
        });
    })));

    console.log(colors.green("Started services!"));
    console.log(colors.white("Press Ctrl+C to stop services."));
}

export async function remove(process: Process) {
    return new Promise((resolve, reject) => {
        pm2.delete(process, (err, proc) => {
            if (err) return reject(err);
            resolve(true);
        });
    });
}

export async function stop(process: Process) {
    return new Promise((resolve, reject) => {
        pm2.stop(process, (err, proc) => {
            if (err) return reject(err);
            resolve(true);
        });
    });
}

start();

process.on("beforeExit", async () => {
    console.log(colors.red("Stopping services..."));
    await Promise.all([remove(Process.FRONTEND), remove(Process.BACKEND)]).catch((err) => {
        console.error(colors.red("Error: "), err);
    });
});

process.on("unhandledRejection", (err) => {
    console.error(colors.red("Unhandled Promise rejection: "), err);
});

process.on("SIGINT", async () => {
    console.log(colors.red("Stopping services..."));
    await Promise.all([remove(Process.FRONTEND), remove(Process.BACKEND)]).catch((err) => {
        console.error(colors.red("Error: "), err);
    });
    process.exit();
});

export const enum Process {
    FRONTEND = "anify-frontend",
    BACKEND = "anify-backend"
}