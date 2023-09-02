import colors from "colors";
import { parseEnv, promptEnv } from "./env";
import { Process } from "../types";
import { build } from "../lib/build";

export async function promptAuth() {
    console.log(colors.yellow("Parsing environment variables..."));

    const auth = await parseEnv(Process.AUTH);
    await promptEnv(Process.AUTH, auth);

    // Test out installing and building
    const buildData = await build(Process.AUTH);

    if (!buildData) {
        console.log(colors.red("Build failed. Please check the above for errors.\n"));
        return;
    }

    console.log(colors.green("Build succeeded. Authentication server is all setup."));
}