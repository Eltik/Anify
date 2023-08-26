export declare function connect(): Promise<unknown>;
export declare function list(): Promise<unknown>;
export declare function start(process: Process): Promise<unknown>;
export declare function reload(process: Process): Promise<unknown>;
export declare function remove(process: Process): Promise<unknown>;
export declare function stop(process: Process): Promise<unknown>;
export declare function generateKey(): Promise<string>;
export declare const enum Process {
    FRONTEND = "anify-frontend",
    BACKEND = "anify-backend",
    AUTH = "anify-auth"
}
