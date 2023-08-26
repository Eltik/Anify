import dotenv from "dotenv";
dotenv.config();

import colors from "colors";
import { loadCommands, loadEvents, login, registerCommands } from "../bot";

(async function () {
    await Promise.all([registerCommands(), loadCommands(), loadEvents(), login()]).catch((err) => {
        console.error(colors.red("Error: "), err);
    });
})();
