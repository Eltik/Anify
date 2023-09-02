"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadEnv = exports.loadRequiredEnv = void 0;
const promises_1 = require("fs/promises");
const fs_1 = require("fs");
const loadRequiredEnv = async (process) => {
    if (!(0, fs_1.existsSync)(`../${process}/.env.example`)) {
        return [];
    }
    const env = await (0, promises_1.readFile)(`../${process}/.env.example`, "utf-8");
    // Convert to JSON
    const envVariables = {};
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
        let parsedValue = value.trim();
        parsedValue = parsedValue.startsWith('"') && parsedValue.endsWith('"') ? parsedValue.slice(1, -1) : parsedValue;
        if (parsedValue?.toLowerCase() === "true") {
            parsedValue = true;
        }
        else if (parsedValue?.toLowerCase() === "false") {
            parsedValue = false;
        }
        else if (!isNaN(Number(parsedValue))) {
            parsedValue = Number(parsedValue);
        }
        envVariables[key] = parsedValue;
    });
    // Return the keys
    return Object.keys(envVariables);
};
exports.loadRequiredEnv = loadRequiredEnv;
const loadEnv = async (process) => {
    if (!(0, fs_1.existsSync)(`../${process}/.env`)) {
        return {};
    }
    const env = await (0, promises_1.readFile)(`../${process}/.env`, "utf-8");
    // Convert to JSON
    const envVariables = {};
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
        let parsedValue = value.trim();
        parsedValue = parsedValue.startsWith('"') ? parsedValue.slice(1) : parsedValue;
        parsedValue = parsedValue.endsWith('"') ? parsedValue.slice(0, -1) : parsedValue;
        if (parsedValue?.toLowerCase() === "true") {
            parsedValue = true;
        }
        else if (parsedValue?.toLowerCase() === "false") {
            parsedValue = false;
        }
        else if (!isNaN(Number(parsedValue))) {
            parsedValue = Number(parsedValue);
        }
        envVariables[key] = parsedValue;
    });
    return envVariables;
};
exports.loadEnv = loadEnv;
