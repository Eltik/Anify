import colors from "colors";
import { parseEnv, promptEnv } from "./env";
import { Process } from "../types";
import { build } from "../lib/build";

export async function promptBackend() {
    console.log(colors.yellow("Parsing environment variables..."));

    const backend = await parseEnv(Process.BACKEND);
    await promptEnv(Process.BACKEND, backend);

    // Test out installing and building
    const buildData = await build(Process.BACKEND);
    if (!buildData) {
        return;
    }

    console.log(colors.green("Build succeeded. Backend server is all setup."));
}