import list from "./list";
import kill from "./kill";
import run from "./run";
import build from "./build";
import update from "./update";

export const runningProcesses: Map<string, import("child_process").ChildProcess> = new Map();

export { list, kill, run, build, update };
