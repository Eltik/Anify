import { Process } from "../types";
export declare function promptEnvVariables(): Promise<void>;
export declare function parseEnv(process: Process): Promise<string[]>;
export declare function promptEnv(process: Process, missing: string[]): Promise<void>;
