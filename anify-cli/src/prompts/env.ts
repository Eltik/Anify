import * as inquirer from "inquirer";
import colors from "colors";
import { Process } from "../types";
import { loadEnv, loadRequiredEnv } from "../lib/loadEnv";
import { writeFile } from "fs/promises";

export async function promptEnvVariables() {
    // Setup environment variables
    console.log(colors.yellow("Parsing environment variables..."));

    const backend = await parseEnv(Process.BACKEND);
    await promptEnv(Process.BACKEND, backend);

    const frontend = await parseEnv(Process.FRONTEND);
    await promptEnv(Process.FRONTEND, frontend);

    const auth = await parseEnv(Process.AUTH);
    await promptEnv(Process.AUTH, auth);

    const manager = await parseEnv(Process.MANAGER);
    await promptEnv(Process.MANAGER, manager);

    console.log(colors.green("Successfully setup environment variables."));
}

export async function parseEnv(process: Process) {
    const required = await loadRequiredEnv(process);
    const current = await loadEnv(process);

    // Check if all required environment variables are present
    const missing = required.filter((key) => !current[key]);
    if (missing.length > 0) {
        console.error(colors.red(`Missing required environment variables: ${colors.yellow(missing.join(", "))} for ${colors.yellow(process)}.`));
        return missing;
    } else {
        console.log(colors.green("All required environment variables are present for ") + colors.yellow(process) + colors.green("."));
        return [];
    }
}

async function promptEnv(process: Process, missing: string[]) {
    // Prompt the user for the missing environment variables
    const env = await loadEnv(process);

    if (missing.length === 0) {
        return;
    }

    console.log("\n");

    console.log(colors.bold(colors.yellow("Please enter the following environment variables:")));
    for (const key of missing) {
        const value = await inquirer.prompt({
            type: "input",
            name: key,
            message: "Enter a value for " + colors.yellow(key) + ". Leave blank for none:",
            default: env[key] ?? "",
        });

        if (!value[key] || String(value[key]).trim() === "") {
            delete env[key];
            continue;
        }

        let parsedValue: string | boolean | number = value[key];
        parsedValue = typeof parsedValue === "number" || typeof parsedValue === "boolean" ? parsedValue : parsedValue.startsWith('"') && parsedValue.endsWith('"') ? parsedValue.slice(1, -1) : parsedValue;

        if (String(parsedValue)?.toLowerCase() === "true") {
            parsedValue = true;
        } else if (String(parsedValue)?.toLowerCase() === "false") {
            parsedValue = false;
        } else if (!isNaN(Number(parsedValue))) {
            parsedValue = Number(parsedValue);
        }

        env[key] = parsedValue;
    }

    // Write the environment variables to the .env file
    await writeFile(`../${process}/.env`, Object.entries(env).map(([key, value]) => `${key}=${typeof value === "string" ? `"${value}"` : value}`).join("\n"));
    console.log(colors.green("Successfully wrote environment variables to ") + colors.yellow(`../${process}/.env`) + colors.green("."));
    
    console.log("\n");
}