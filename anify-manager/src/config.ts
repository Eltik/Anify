export const buildCommands: {
    [key: string]: {
        command: string;
        ".env"?: string;
    };
} = {
    anify: {
        command: "bun i && bun run lint && bun run build",
        ".env": `.env`,
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
