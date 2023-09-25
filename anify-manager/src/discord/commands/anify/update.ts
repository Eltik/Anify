import * as response from "../../responses/anify";
import { update } from "../../../utils/pm2";
import view from "../../../utils/fs/view";

import running from "./running";
import { AutocompleteInteraction, Client, CommandInteraction, ComponentInteraction, Constants, TextableChannel } from "eris";

const logic = async (value?: string) => {
    const list = view();
    console.log(list[0]);
    if (value == "latest" || !value) value = list[0].name;
    console.log(value);

    const data = await update({
        label: value,
    });

    if (data.error) return response.update.error.message(`${data.error}`);
    return response.update.message(data);
};

export default {
    name: "update",
    schema: {
        name: "update",
        description: "Updates the repos of a label.",
        type: Constants.ApplicationCommandTypes.CHAT_INPUT,
        options: [
            {
                name: "select",
                description: "Select a label to update contents of.",
                type: Constants.ApplicationCommandOptionTypes.STRING,
                autocomplete: true,
                required: true,
            },
        ],
    },
    autocomplete: (client: Client, interaction: AutocompleteInteraction) => {
        // get the current text the user has sent
        const firstOptions = interaction.data.options[0];
        let secondOptions: any = {};
        let text: string;

        if ("options" in firstOptions) {
            secondOptions = firstOptions?.options?.at(0);
        }
        if ("value" in secondOptions) {
            text = secondOptions?.value as string;
        }

        const list = view().filter((x) => x.name.includes(text));
        interaction.result([
            ...list.map((x) => ({
                name: x.name,
                value: x.name,
            })),
        ]);
    },
    on: async (client: Client, interaction: CommandInteraction<TextableChannel>) => {
        const value = (interaction?.data?.options?.[0] as any)?.options?.[0]?.value as string;

        if (!interaction.acknowledged) await interaction.acknowledge(1);
        const embed = await logic(value);
        interaction.editOriginalMessage(embed);
    },
    onInteraction: async (client: Client, interaction: ComponentInteraction<TextableChannel>) => {
        // This is a button to make view the running scripts
        console.log(interaction.data);
        if (interaction.data.component_type === 2) {
            interaction.createMessage(await running.logic());
        }
    },
    logic,
};
