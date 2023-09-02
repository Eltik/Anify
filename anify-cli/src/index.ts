import dotenv from "dotenv";
dotenv.config();

import { program } from "commander";
import * as inquirer from "inquirer";
import { promptEnvVariables } from "./prompts/env";
import { promptBackend } from "./prompts/backend";
import { promptFrontend } from "./prompts/frontend";
import { promptAuth } from "./prompts/auth";
import { promptManager } from "./prompts/manager";

program.description("A robust CLI for creating a web server for anime, manga, and light novels.")
    .option("-e, -enviornment", "Setup the environment variables.")
    .option("-b, -backend", "Setup the backend.")
    .option("-f, -frontend", "Setup the frontend.")
    .option("-a, -auth", "Setup the authentication.")
    .option("-m, -manager", "Setup the manager.");

program.parse()

const options = program.opts();

 if (options.e) {
    promptEnvVariables();
} else if (options.b) {
    promptBackend();
} else if (options.f) {
    promptFrontend();
} else if (options.a) {
    promptAuth();
} else if (options.m) {
    promptManager();
} else {
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
            await promptEnvVariables();
            break;
        case "Backend":
            await promptBackend();
            break;
        case "Frontend":
            await promptFrontend();
            break;
        case "Authentication":
            await promptAuth();
            break;
        case "Manager":
            await promptManager();
            break;
        default:
            break;
    }
}