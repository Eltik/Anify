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
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const inquirer = __importStar(require("inquirer"));
const env_1 = require("./prompts/env");
const backend_1 = require("./prompts/backend");
const frontend_1 = require("./prompts/frontend");
const auth_1 = require("./prompts/auth");
const manager_1 = require("./prompts/manager");
commander_1.program.description("A robust CLI for creating a web server for anime, manga, and light novels.")
    .option("-e, -enviornment", "Setup the environment variables.")
    .option("-b, -backend", "Setup the backend.")
    .option("-f, -frontend", "Setup the frontend.")
    .option("-a, -auth", "Setup the authentication.")
    .option("-m, -manager", "Setup the manager.");
commander_1.program.parse();
const options = commander_1.program.opts();
if (options.e) {
    (0, env_1.promptEnvVariables)();
}
else if (options.b) {
    (0, backend_1.promptBackend)();
}
else if (options.f) {
    (0, frontend_1.promptFrontend)();
}
else if (options.a) {
    (0, auth_1.promptAuth)();
}
else if (options.m) {
    (0, manager_1.promptManager)();
}
else {
    promptSetup();
}
async function promptSetup() {
    const { type } = await inquirer.prompt({
        type: "list",
        name: "type",
        message: "What setup are you looking for?",
        choices: [
            "Environmental Variables",
            "Backend",
            "Frontend",
            "Authentication",
            "Manager"
        ],
        default: "Anime",
    });
    switch (type) {
        case "Environmental Variables":
            await (0, env_1.promptEnvVariables)();
            break;
        case "Backend":
            await (0, backend_1.promptBackend)();
            break;
        case "Frontend":
            await (0, frontend_1.promptFrontend)();
            break;
        case "Authentication":
            await (0, auth_1.promptAuth)();
            break;
        case "Manager":
            await (0, manager_1.promptManager)();
            break;
        default:
            break;
    }
}
