"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateKey = exports.stop = exports.remove = exports.reload = exports.start = exports.list = exports.connect = void 0;
const pm2_1 = __importDefault(require("pm2"));
const colors_1 = __importDefault(require("colors"));
const child_process_1 = require("child_process");
async function connect() {
    return new Promise((resolve, reject) => {
        pm2_1.default.connect(async (err) => {
            if (err) {
                console.error(err);
                process.exit(2);
            }
            resolve(true);
        });
    });
}
exports.connect = connect;
async function list() {
    return new Promise((resolve, reject) => {
        pm2_1.default.list((err, list) => {
            if (err)
                return reject(err);
            resolve(list);
        });
    });
}
exports.list = list;
async function start(process) {
    if (process === "anify-frontend" /* Process.FRONTEND */) {
        return new Promise((resolve, reject) => {
            pm2_1.default.start({
                script: "cd ../anify-frontend && npm run start",
                name: "anify-frontend",
            }, (err, apps) => {
                if (err) {
                    console.error(colors_1.default.red("Error starting up frontend."));
                    console.error(err);
                    pm2_1.default.disconnect();
                    reject(err);
                    return;
                }
                resolve(true);
            });
        });
    }
    else if (process === "anify-backend" /* Process.BACKEND */) {
        return new Promise((resolve, reject) => {
            pm2_1.default.start({
                script: "cd ../anify-backend && NODE_ENV=production npm run start",
                name: "anify-backend",
            }, (err, apps) => {
                if (err) {
                    console.error(colors_1.default.red("Error starting up backend."));
                    console.error(err);
                    pm2_1.default.disconnect();
                    reject(err);
                    return;
                }
                resolve(true);
            });
        });
    }
    else if (process === "anify-auth" /* Process.AUTH */) {
        return new Promise((resolve, reject) => {
            pm2_1.default.start({
                script: "cd ../anify-auth && npm run start",
                name: "anify-auth",
            }, (err, apps) => {
                if (err) {
                    console.error(colors_1.default.red("Error starting up auth."));
                    console.error(err);
                    pm2_1.default.disconnect();
                    reject(err);
                    return;
                }
                resolve(true);
            });
        });
    }
}
exports.start = start;
async function reload(process) {
    return new Promise((resolve, reject) => {
        pm2_1.default.reload(process, (err, proc) => {
            if (err)
                return reject(err);
            resolve(true);
        });
    });
}
exports.reload = reload;
async function remove(process) {
    return new Promise((resolve, reject) => {
        pm2_1.default.delete(process, (err, proc) => {
            if (err)
                return reject(err);
            resolve(true);
        });
    });
}
exports.remove = remove;
async function stop(process) {
    return new Promise((resolve, reject) => {
        pm2_1.default.stop(process, (err, proc) => {
            if (err)
                return reject(err);
            resolve(true);
        });
    });
}
exports.stop = stop;
async function generateKey() {
    return new Promise((resolve, reject) => {
        (0, child_process_1.exec)("cd ../anify-backend && npm run create:key", (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing command: ${error.message}`);
                reject(error);
            }
            else if (stderr) {
                console.error(`Command error: ${stderr}`);
                reject(new Error(stderr));
            }
            else {
                const lines = stdout.trim().split("\n");
                const key = lines[lines.length - 1].trim();
                resolve(key);
            }
        });
    });
}
exports.generateKey = generateKey;
