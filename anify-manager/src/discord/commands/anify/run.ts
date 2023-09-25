import * as response from "../../responses/anify";
import { run } from "../../../utils/pm2";
import view from "../../../utils/fs/view";

import running from "./running";
import { AutocompleteInteraction, Client, CommandInteraction, ComponentInteraction, Constants, TextableChannel } from "eris";

const logic = async (value?: string) => {
    const list = view();
    if (value == "latest" || !value) value = list[0].name;
    const [first, second] = await run(value);

    if (first.error || second?.error) return response.run.error.message(`${first.error} - ${first.data} \n ${second.error} - ${second.data}`);

    return response.run.message([second, first]);
};

export default {
    name: "run",
    schema: {
        name: "run",
        description: "Starts a new process.",
        type: Constants.ApplicationCommandTypes.CHAT_INPUT,
        options: [
            {
                name: "select",
                description: "Select a label to run.",
                type: Constants.ApplicationCommandOptionTypes.STRING,
                autocomplete: true,
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
            {
                name: "latest",
                value: "latest",
            },
        ]);
    },
    on: async (client: Client, interaction: CommandInteraction<TextableChannel>) => {
        const value = (interaction?.data?.options?.[0] as any)?.options?.[0]?.value as string;

        const embed = await logic(value);
        interaction.createMessage(embed);
    },
    onInteraction: async (client: Client, interaction: ComponentInteraction<TextableChannel>) => {
        // This is a button to make view the running scripts
        if (interaction.data.component_type === 2) {
            interaction.createMessage(await running.logic());
        }
    },
    logic,
};
