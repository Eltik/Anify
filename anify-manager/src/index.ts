import dotenv from "dotenv";
dotenv.config();
import colors from "colors";
import { loadCommands, loadEvents, login, registerCommands } from "./bot";
import { Process, connect, remove, start } from "./manager";

(async function () {
    try {
        await Promise.all([startManager(), startBot()]);
    } catch (err) {
        console.error(colors.red("Error: "), err);
    }
})();

async function startManager() {
    await connect();
    await Promise.all([start(Process.FRONTEND), start(Process.BACKEND), start(Process.AUTH)]).catch((err) => {
        console.error(colors.red("Error: "), err);
    });
    console.log(colors.green("Started process manager."));
}

async function startBot() {
    if (!process.env.TOKEN) {
        console.log(colors.red("No Discord token provided. Discord bot will not be started up."));
        return;
    }
    if (!process.env.CLIENT) {
        console.log(colors.red("No Discord client ID provided. Discord bot will not be started up."));
        return;
    }
    if (!process.env.GUILD) {
        console.log(colors.red("No Discord guild ID provided. Discord bot will not be started up."));
        return;
    }
    if (!process.env.FRONTEND) {
        console.log(colors.yellow("WARNING: Frontend URL not provided. Discord bot will likely have issues. Please provide the URL in the .env file."));
    }
    if (!process.env.API) {
        console.log(colors.yellow("WARNING: API URL not provided. Discord bot will likely have issues. Please provide the URL in the .env file."));
    }
    if (!process.env.AUTH) {
        console.log(colors.yellow("WARNING: Auth URL not provided. Discord bot will likely have issues. Please provide the URL in the .env file."));
    }
    if (!process.env.MASTER_KEY) {
        console.log(colors.yellow("WARNING: Master key not provided. Discord bot will likely have issues. Please provide the key in the .env file."));
    }
    await Promise.all([registerCommands(), loadCommands(), loadEvents(), login()]).catch((err) => {
        console.error(colors.red("Error: "), err);
    });
}

process.on("beforeExit", async () => {
    console.log(colors.red("Stopping services..."));
    await Promise.all([remove(Process.FRONTEND), remove(Process.BACKEND), remove(Process.AUTH)]).catch((err) => {
        console.error(colors.red("Error: "), err);
    });
});

process.on("unhandledRejection", (err) => {
    console.error(colors.red("Unhandled Promise rejection: "), err);
});

process.on("SIGINT", async () => {
    console.log(colors.red("Stopping services..."));
    await Promise.all([remove(Process.FRONTEND), remove(Process.BACKEND)]).catch((err) => {
        console.error(colors.red("Error: "), err);
    });
    process.exit();
});
