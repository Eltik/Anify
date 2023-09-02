"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptManager = void 0;
const colors_1 = __importDefault(require("colors"));
const env_1 = require("./env");
const build_1 = require("../lib/build");
async function promptManager() {
    console.log(colors_1.default.yellow("Parsing environment variables..."));
    const manager = await (0, env_1.parseEnv)("anify-manager" /* Process.MANAGER */);
    await (0, env_1.promptEnv)("anify-manager" /* Process.MANAGER */, manager);
    // Test out installing and building
    const buildData = await (0, build_1.build)("anify-manager" /* Process.MANAGER */);
    if (!buildData) {
        return;
    }
    console.log(colors_1.default.green("Build succeeded. Manager is all setup."));
}
exports.promptManager = promptManager;
