import colors from "colors";
import { parseEnv, promptEnv } from "./env";
import { Process } from "../types";
import { build } from "../lib/build";

export async function promptManager() {
    console.log(colors.yellow("Parsing environment variables..."));

    const manager = await parseEnv(Process.MANAGER);
    await promptEnv(Process.MANAGER, manager);

    // Test out installing and building
    const buildData = await build(Process.MANAGER);
    if (!buildData) {
        return;
    }

    console.log(colors.green("Build succeeded. Manager is all setup."));
}