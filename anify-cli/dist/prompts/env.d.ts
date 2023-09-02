import { Process } from "../types";
export declare function promptEnvVariables(): Promise<void>;
export declare function parseEnv(process: Process): Promise<string[]>;
