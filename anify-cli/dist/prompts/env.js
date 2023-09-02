"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptEnv = exports.parseEnv = exports.promptEnvVariables = void 0;
const inquirer = __importStar(require("inquirer"));
const colors_1 = __importDefault(require("colors"));
const loadEnv_1 = require("../lib/loadEnv");
const promises_1 = require("fs/promises");
async function promptEnvVariables() {
    // Setup environment variables
    console.log(colors_1.default.yellow("Parsing environment variables..."));
    const backend = await parseEnv("anify-backend" /* Process.BACKEND */);
    await promptEnv("anify-backend" /* Process.BACKEND */, backend);
    const frontend = await parseEnv("anify-frontend" /* Process.FRONTEND */);
    await promptEnv("anify-frontend" /* Process.FRONTEND */, frontend);
    const auth = await parseEnv("anify-auth" /* Process.AUTH */);
    await promptEnv("anify-auth" /* Process.AUTH */, auth);
    const manager = await parseEnv("anify-manager" /* Process.MANAGER */);
    await promptEnv("anify-manager" /* Process.MANAGER */, manager);
    console.log(colors_1.default.green("Successfully setup environment variables."));
}
exports.promptEnvVariables = promptEnvVariables;
async function parseEnv(process) {
    const required = await (0, loadEnv_1.loadRequiredEnv)(process);
    const current = await (0, loadEnv_1.loadEnv)(process);
    // Check if all required environment variables are present
    const missing = required.filter((key) => !current[key]);
    if (missing.length > 0) {
        console.error(colors_1.default.red(`Missing required environment variables: ${colors_1.default.yellow(missing.join(", "))} for ${colors_1.default.yellow(process)}.`));
        return missing;
    }
    else {
        console.log(colors_1.default.green("All required environment variables are present for ") + colors_1.default.yellow(process) + colors_1.default.green("."));
        return [];
    }
}
exports.parseEnv = parseEnv;
async function promptEnv(process, missing) {
    // Prompt the user for the missing environment variables
    const env = await (0, loadEnv_1.loadEnv)(process);
    if (missing.length === 0) {
        return;
    }
    console.log("\n");
    console.log(colors_1.default.bold(colors_1.default.yellow("Please enter the following environment variables:")));
    for (const key of missing) {
        const value = await inquirer.prompt({
            type: "input",
            name: key,
            message: "Enter a value for " + colors_1.default.yellow(key) + ". Leave blank for none:",
            default: env[key] ?? "",
        });
        if (!value[key] || String(value[key]).trim() === "") {
            delete env[key];
            continue;
        }
        let parsedValue = value[key];
        parsedValue = typeof parsedValue === "number" || typeof parsedValue === "boolean" ? parsedValue : parsedValue.startsWith('"') && parsedValue.endsWith('"') ? parsedValue.slice(1, -1) : parsedValue;
        if (String(parsedValue)?.toLowerCase() === "true") {
            parsedValue = true;
        }
        else if (String(parsedValue)?.toLowerCase() === "false") {
            parsedValue = false;
        }
        else if (!isNaN(Number(parsedValue))) {
            parsedValue = Number(parsedValue);
        }
        env[key] = parsedValue;
    }
    // Write the environment variables to the .env file
    await (0, promises_1.writeFile)(`../${process}/.env`, Object.entries(env).map(([key, value]) => `${key}=${typeof value === "string" ? `"${value}"` : value}`).join("\n"));
    console.log(colors_1.default.green("Successfully wrote environment variables to ") + colors_1.default.yellow(`../${process}/.env`) + colors_1.default.green("."));
    console.log("\n");
}
exports.promptEnv = promptEnv;
