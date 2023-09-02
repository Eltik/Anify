import { readFile } from "fs/promises";
import { Process } from "../types";
import { existsSync } from "fs";

export const loadRequiredEnv = async (process: Process) => {
    if (!existsSync(`../${process}/.env.example`)) {
        return [];
    }

    const env = await readFile(`../${process}/.env.example`, "utf-8");
    // Convert to JSON
    const envVariables: Record<string, string | boolean | number> = {};

    env.split("\n").forEach((line) => {
        if (line.startsWith("#")) {
            // Ignore comments
            return;
        }

        const [key, value] = line.split("=");
        if (!key || !value) {
            return;
        }

        // Try to parse values into appropriate types
        let parsedValue: string | boolean | number = value.trim();
        parsedValue = parsedValue.startsWith('"') && parsedValue.endsWith('"') ? parsedValue.slice(1, -1) : parsedValue;

        if (parsedValue?.toLowerCase() === "true") {
            parsedValue = true;
        } else if (parsedValue?.toLowerCase() === "false") {
            parsedValue = false;
        } else if (!isNaN(Number(parsedValue))) {
            parsedValue = Number(parsedValue);
        }

        envVariables[key] = parsedValue;
    });

    // Return the keys
    return Object.keys(envVariables);
};

export const loadEnv = async (process: Process) => {
    if (!existsSync(`../${process}/.env`)) {
        return {};
    }

    const env = await readFile(`../${process}/.env`, "utf-8");
    // Convert to JSON
    const envVariables: Record<string, string | boolean | number> = {};

    env.split("\n").forEach((line) => {
        if (line.startsWith("#")) {
            // Ignore comments
            return;
        }

        const equalIndex = line.indexOf("=");
        if (equalIndex === -1) {
            // Skip lines without '='
            return;
        }

        const key = line.slice(0, equalIndex).trim();
        const value = line.slice(equalIndex + 1).trim();

        // Try to parse values into appropriate types
        let parsedValue: string | boolean | number = value.trim();
        parsedValue = parsedValue.startsWith('"') ? parsedValue.slice(1) : parsedValue;
        parsedValue = parsedValue.endsWith('"') ? parsedValue.slice(0, -1) : parsedValue;

        if (parsedValue?.toLowerCase() === "true") {
            parsedValue = true;
        } else if (parsedValue?.toLowerCase() === "false") {
            parsedValue = false;
        } else if (!isNaN(Number(parsedValue))) {
            parsedValue = Number(parsedValue);
        }

        envVariables[key] = parsedValue;
    });

    return envVariables;
};
