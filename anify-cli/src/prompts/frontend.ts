import colors from "colors";
import { parseEnv, promptEnv } from "./env";
import { Process } from "../types";
import { build } from "../lib/build";

export async function promptFrontend() {
    console.log(colors.yellow("Parsing environment variables..."));

    const frontend = await parseEnv(Process.FRONTEND);
    await promptEnv(Process.FRONTEND, frontend);

    // Test out installing and building
    const buildData = await build(Process.FRONTEND);
    if (!buildData) {
        return;
    }

    console.log(colors.green("Build succeeded. Frontend server is all setup."));
}