"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.promptAuth = void 0;
const colors_1 = __importDefault(require("colors"));
const env_1 = require("./env");
const build_1 = require("../lib/build");
async function promptAuth() {
    console.log(colors_1.default.yellow("Parsing environment variables..."));
    const auth = await (0, env_1.parseEnv)("anify-auth" /* Process.AUTH */);
    await (0, env_1.promptEnv)("anify-auth" /* Process.AUTH */, auth);
    // Test out installing and building
    await (0, build_1.build)("anify-auth" /* Process.AUTH */);
}
exports.promptAuth = promptAuth;
