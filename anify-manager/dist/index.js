"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const colors_1 = __importDefault(require("colors"));
const bot_1 = require("./bot");
const manager_1 = require("./manager");
(async function () {
    try {
        await Promise.all([startManager(), startBot()]);
    }
    catch (err) {
        console.error(colors_1.default.red("Error: "), err);
    }
})();
async function startManager() {
    await (0, manager_1.connect)();
    await Promise.all([(0, manager_1.start)("anify-frontend" /* Process.FRONTEND */), (0, manager_1.start)("anify-backend" /* Process.BACKEND */), (0, manager_1.start)("anify-auth" /* Process.AUTH */)]).catch((err) => {
        console.error(colors_1.default.red("Error: "), err);
    });
    console.log(colors_1.default.green("Started process manager."));
}
async function startBot() {
    if (!process.env.TOKEN) {
        console.log(colors_1.default.red("No Discord token provided. Discord bot will not be started up."));
        return;
    }
    if (!process.env.CLIENT) {
        console.log(colors_1.default.red("No Discord client ID provided. Discord bot will not be started up."));
        return;
    }
    if (!process.env.GUILD) {
        console.log(colors_1.default.red("No Discord guild ID provided. Discord bot will not be started up."));
        return;
    }
    if (!process.env.FRONTEND) {
        console.log(colors_1.default.yellow("WARNING: Frontend URL not provided. Discord bot will likely have issues. Please provide the URL in the .env file."));
    }
    if (!process.env.API) {
        console.log(colors_1.default.yellow("WARNING: API URL not provided. Discord bot will likely have issues. Please provide the URL in the .env file."));
    }
    if (!process.env.AUTH) {
        console.log(colors_1.default.yellow("WARNING: Auth URL not provided. Discord bot will likely have issues. Please provide the URL in the .env file."));
    }
    if (!process.env.MASTER_KEY) {
        console.log(colors_1.default.yellow("WARNING: Master key not provided. Discord bot will likely have issues. Please provide the key in the .env file."));
    }
    await Promise.all([(0, bot_1.registerCommands)(), (0, bot_1.loadCommands)(), (0, bot_1.loadEvents)(), (0, bot_1.login)()]).catch((err) => {
        console.error(colors_1.default.red("Error: "), err);
    });
}
process.on("beforeExit", async () => {
    console.log(colors_1.default.red("Stopping services..."));
    await Promise.all([(0, manager_1.remove)("anify-frontend" /* Process.FRONTEND */), (0, manager_1.remove)("anify-backend" /* Process.BACKEND */), (0, manager_1.remove)("anify-auth" /* Process.AUTH */)]).catch((err) => {
        console.error(colors_1.default.red("Error: "), err);
    });
});
process.on("unhandledRejection", (err) => {
    console.error(colors_1.default.red("Unhandled Promise rejection: "), err);
});
process.on("SIGINT", async () => {
    console.log(colors_1.default.red("Stopping services..."));
    await Promise.all([(0, manager_1.remove)("anify-frontend" /* Process.FRONTEND */), (0, manager_1.remove)("anify-backend" /* Process.BACKEND */)]).catch((err) => {
        console.error(colors_1.default.red("Error: "), err);
    });
    process.exit();
});
