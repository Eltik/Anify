import { Process } from "../types";
export declare const loadRequiredEnv: (process: Process) => Promise<string[]>;
export declare const loadEnv: (process: Process) => Promise<Record<string, string | number | boolean>>;
