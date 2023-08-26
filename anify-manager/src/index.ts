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
