import { createCustomEmbed, customEmbed, error, notImplemented } from "../responses";
import { Stats } from "fs";

export const update: customEmbed<{
    data: {
        [key: string]: string;
    }[];
}> = createCustomEmbed({
    embeds: ({ data }) => {
        return [
            {
                title: "Updated",
                fields: data.map((x) => ({
                    name: Object.keys(x)[0],
                    value: x[Object.keys(x)[0]],
                })),
            },
        ];
    },
});

export const run: customEmbed<
    {
        error?: string;
        data?: string;
    }[]
> = createCustomEmbed({
    embeds: (repos) => [
        {
            title: repos.map((x) => (x?.error ? `${x?.error} - ${x?.data}` : `Started ${x?.data}`)).join("\n"),
        },
    ],
    components: () => [
        {
            type: 1,
            components: [
                {
                    type: 2,
                    label: `view running processes`,
                    emoji: {
                        id: "1108981152431226891",
                    },
                    style: 1,
                    custom_id: "kato-running",
                },
            ],
        },
    ],
});

export const viewRunningRepo: customEmbed<string[]> = createCustomEmbed({
    embeds: (repos) => [
        {
            title: "Select a repository",
            fields: repos.map((x) => ({
                name: x,
                value: `Click the ${x} below to **KILL** the pm2 process`,
            })),
        },
    ],
    components: (repos) => [
        {
            type: 1,
            components: repos.map((x) => ({
                type: 2,
                label: `${x}`,
                emoji: {
                    id: "1108981152431226891",
                },
                style: 4,
                custom_id: x,
            })),
        },
    ],
    error: {
        embeds: error.embeds,
        message: (reason) => ({
            embeds: error.embeds(reason),
            components: [
                {
                    type: 1,
                    components: [
                        {
                            type: 2,
                            label: `run latest`,
                            style: 1,
                            custom_id: "kato-run",
                        },
                    ],
                },
            ],
        }),
    },
});

export const stopRepo: customEmbed<
    {
        error?: string;
        data: string;
    }[]
> = createCustomEmbed({
    embeds: (repos) => [
        {
            title: repos.map((x) => (x.error ? `${x.error} - ${x.data}` : `Stopped ${x.data}`)).join("\n"),
            color: repos.some((x) => x.error) ? 0xff0000 : 0x00ff00,
        },
    ],
    message: (repos) => ({
        embeds: stopRepo.embeds(repos),
    }),
});

interface listRepoStats extends Stats {
    name: string;
}

export const listRepo: customEmbed<listRepoStats[]> = createCustomEmbed({
    embeds: (repos) => [
        {
            title: "These are the current repositories",
            fields: repos.map((x) => ({
                name: x.name,
                value: `**Created:** <t:${Math.floor(x.birthtimeMs / 1000)}:R>\n**Last Modified:** <t:${Math.floor(x.mtimeMs / 1000)}:R>`,
            })),
        },
    ],
});

export const selectRepo: customEmbed = {
    ...notImplemented,
    error,
};
