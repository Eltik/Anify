export const buildCommands: {
    [key: string]: {
        command: string;
        ".env"?: string;
    };
} = {
    anify: {
        command: "npm run install && npm run lint && npm run build",
        ".env": `.env`,
    },
};

export const runCommands: {
    [key: string]: string;
} = {
    anify: "npm run start",
};

export const repositories = [
    {
        url: "https://github.com/concumin/Anify",
        name: "anify",
    },
];
