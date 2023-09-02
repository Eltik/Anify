"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptFrontend = void 0;
const colors_1 = __importDefault(require("colors"));
const env_1 = require("./env");
const build_1 = require("../lib/build");
async function promptFrontend() {
    console.log(colors_1.default.yellow("Parsing environment variables..."));
    const frontend = await (0, env_1.parseEnv)("anify-frontend" /* Process.FRONTEND */);
    await (0, env_1.promptEnv)("anify-frontend" /* Process.FRONTEND */, frontend);
    // Test out installing and building
    const buildData = await (0, build_1.build)("anify-frontend" /* Process.FRONTEND */);
    if (!buildData) {
        return;
    }
    console.log(colors_1.default.green("Build succeeded. Frontend server is all setup."));
}
exports.promptFrontend = promptFrontend;
