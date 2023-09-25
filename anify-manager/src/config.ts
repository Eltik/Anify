export const buildCommands: {
    [key: string]: {
        command: string;
        copyProxies?: boolean;
        proxies?: string;
        backendFolder?: string;
        backendEnv?: string;
        frontendFolder?: string;
        frontendEnv?: string;
        authFolder?: string;
        authEnv?: string;
    };
} = {
    anify: {
        command: "bun i && bun run lint && bun run build",
        copyProxies: true,
        proxies: "../anify-backend/goodProxies.json",
        backendFolder: "anify-backend",
        backendEnv: "../anify-backend/.env",
        frontendFolder: "anify-frontend",
        frontendEnv: "../anify-frontend/.env",
        authFolder: "anify-auth",
        authEnv: "../anify-auth/.env",
    },
};

export const runCommands: {
    [key: string]: string;
} = {
    anify: "start",
};

export const repositories = [
    {
        url: "https://github.com/concumin/Anify",
        name: "anify",
    },
];
