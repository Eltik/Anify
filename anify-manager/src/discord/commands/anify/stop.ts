import * as response from "../../responses/anify";

import { kill } from "../../../utils/pm2";
import view from "../../../utils/fs/view";
import { runCommands } from "../../../config";
import { AutocompleteInteraction, Client, CommandInteraction, Constants, TextableChannel } from "eris";

export default {
    name: "stop",
    schema: {
        name: "stop",
        description: "stop a running processes of PM2.",
        type: Constants.ApplicationCommandTypes.CHAT_INPUT,
        options: [
            {
                name: "version",
                description: "Select a version to stop.",
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
        let name: string | undefined = (interaction?.data?.options?.[0] as any)?.options?.[0]?.value as string;
        const keys = Object.keys(runCommands);
        const list = view();

        if (name == "latest") name = list[0].name;

        const data = await kill(keys.map((x) => list.find((x) => x.name == name)?.name + `-${x}` || name + `-${x}`));

        interaction.createMessage(response.stopRepo.message(data));
    },
};
