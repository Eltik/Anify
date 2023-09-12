export const buildCommands: {
    [key: string]: {
        command: string;
        ".env"?: string;
    };
} = {
    anify: {
        command: "npm run build",
        ".env": `.env`,
    },
};

export const runCommands: {
    [key: string]: string;
} = {
    anify: "npm run i",
};

export const repositories = [
    {
        url: "https://github.com/Eltik/Anify",
        name: "anify",
    },
];
