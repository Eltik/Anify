"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptBackend = void 0;
const colors_1 = __importDefault(require("colors"));
const env_1 = require("./env");
const build_1 = require("../lib/build");
async function promptBackend() {
    console.log(colors_1.default.yellow("Parsing environment variables..."));
    const backend = await (0, env_1.parseEnv)("anify-backend" /* Process.BACKEND */);
    await (0, env_1.promptEnv)("anify-backend" /* Process.BACKEND */, backend);
    // Test out installing and building
    const buildData = await (0, build_1.build)("anify-backend" /* Process.BACKEND */);
    if (!buildData) {
        return;
    }
    console.log(colors_1.default.green("Build succeeded. Backend server is all setup."));
}
exports.promptBackend = promptBackend;
