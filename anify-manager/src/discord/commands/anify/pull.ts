import * as response from "../../responses/anify";
import { build } from "../../../utils/pm2";
import { Client, CommandInteraction, Constants, TextableChannel } from "eris";

export default {
    name: "pull",
    schema: {
        name: "pull",
        description: "Pull the latest repository from GitHub under the folder label.",
        type: Constants.ApplicationCommandTypes.CHAT_INPUT,
        options: [
            {
                name: "label",
                description: "The label of the folder which the latest repository will be in.",
                type: Constants.ApplicationCommandOptionTypes.STRING,
                required: true,
            },
        ],
    },
    on: async (client: Client, interaction: CommandInteraction<TextableChannel>) => {
        const value = (interaction?.data?.options?.[0] as any)?.options?.[0]?.value as string;

        if (!interaction.acknowledged) await interaction.acknowledge(1);

        const data = await build(value, ["anify"], 0);

        interaction.editOriginalMessage(response.run.error.message(JSON.stringify(data)));
    },
};
