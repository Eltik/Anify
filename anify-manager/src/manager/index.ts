import pm2 from "pm2";
import colors from "colors";
import * as fs from "fs/promises";
import { join } from "path";
import { exec } from "child_process";

export async function connect() {
    return new Promise((resolve, reject) => {
        pm2.connect(async (err) => {
            if (err) {
                console.error(err);
                process.exit(2);
            }

            resolve(true);
        });
    });
}

export async function list() {
    return new Promise((resolve, reject) => {
        pm2.list((err, list) => {
            if (err) return reject(err);
            resolve(list);
        });
    });
}

export async function start(process: Process) {
    if (process === Process.FRONTEND) {
        return new Promise((resolve, reject) => {
            pm2.start(
                {
                    script: "cd ../anify-frontend && npm run start",
                    name: "anify-frontend",
                },
                (err, apps) => {
                    if (err) {
                        console.error(colors.red("Error starting up frontend."));
                        console.error(err);
                        pm2.disconnect();
                        reject(err);
                        return;
                    }
                    resolve(true);
                }
            );
        });
    } else if (process === Process.BACKEND) {
        return new Promise((resolve, reject) => {
            pm2.start(
                {
                    script: "cd ../anify-backend && NODE_ENV=production npm run start",
                    name: "anify-backend",
                },
                (err, apps) => {
                    if (err) {
                        console.error(colors.red("Error starting up backend."));
                        console.error(err);
                        pm2.disconnect();
                        reject(err);
                        return;
                    }
                    resolve(true);
                }
            );
        });
    } else if (process === Process.AUTH) {
        return new Promise((resolve, reject) => {
            pm2.start(
                {
                    script: "cd ../anify-auth && npm run start",
                    name: "anify-auth",
                },
                (err, apps) => {
                    if (err) {
                        console.error(colors.red("Error starting up auth."));
                        console.error(err);
                        pm2.disconnect();
                        reject(err);
                        return;
                    }
                    resolve(true);
                }
            );
        });
    }
}

export async function reload(process: Process) {
    return new Promise((resolve, reject) => {
        pm2.reload(process, (err, proc) => {
            if (err) return reject(err);
            resolve(true);
        });
    });
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

export async function generateKey(): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        exec("cd ../anify-backend && npm run create:key", (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing command: ${error.message}`);
                reject(error);
            } else if (stderr) {
                console.error(`Command error: ${stderr}`);
                reject(new Error(stderr));
            } else {
                const lines = stdout.trim().split("\n");
                const key = lines[lines.length - 1].trim();
                resolve(key);
            }
        });
    });
}

export const enum Process {
    FRONTEND = "anify-frontend",
    BACKEND = "anify-backend",
    AUTH = "anify-auth",
}
