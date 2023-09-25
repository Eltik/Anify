import { ActionRow, EmbedOptions, InteractionContent } from "eris";
import Eris from "eris/esm";

export interface CustomError {
    embeds: (reason: string) => EmbedOptions[];
    message: (reason: string) => InteractionContent;
}

interface NotImplemented {
    embeds: () => EmbedOptions[];
    message: () => InteractionContent;
}

export interface customEmbed<T = undefined> {
    embeds: (arg0: T) => EmbedOptions[];
    components?: (arg0: T) => ActionRow[];
    message: (arg0: T) => InteractionContent;
    error: CustomError;
}

export function createCustomEmbed<T = undefined>(options?: Partial<customEmbed<T>>): customEmbed<T> {
    const custom: customEmbed<T> = {
        embeds: options?.embeds ?? notImplemented.embeds,
        components: options?.components ?? undefined,
        message:
            options?.message ??
            ((arg0: T) => ({
                embeds: custom.embeds(arg0),
                components: custom.components ? custom.components(arg0) : undefined,
            })),
        error: options?.error ?? error,
    };
    return custom;
}

export const error: CustomError = {
    embeds: (reason) => {
        return [
            {
                title: "Error Occurred!",
                color: 0xff0000,
                description: `${reason}`,
            },
        ];
    },
    message: (reason) => {
        return {
            embeds: error.embeds(reason),
            components: [],
        };
    },
};

export const notImplemented: NotImplemented = {
    embeds: () => {
        return [
            {
                title: "Not Implemented!",
                color: 0xff0000,
                description: `This command is not implemented yet!`,
            },
        ];
    },
    message: () => {
        return {
            embeds: notImplemented.embeds(),
        };
    },
};
