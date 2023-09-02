import colors from "colors";
import { parseEnv, promptEnv } from "./env";
import { Process } from "../types";
import { build } from "../lib/build";

export async function promptAuth() {
    console.log(colors.yellow("Parsing environment variables..."));

    const auth = await parseEnv(Process.AUTH);
    await promptEnv(Process.AUTH, auth);

    // Test out installing and building
    await build(Process.AUTH);
}