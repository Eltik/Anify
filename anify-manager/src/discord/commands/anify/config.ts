import * as response from "../../responses/anify";
import { build } from "../../../utils/pm2";
import { Client, CommandInteraction, Constants, TextableChannel } from "eris";
import { buildCommands } from "../../../config";

export default {
    name: "config",
    schema: {
        name: "config",
        description: "Display the current config.",
        type: Constants.ApplicationCommandTypes.CHAT_INPUT,
    },
    on: async (client: Client, interaction: CommandInteraction<TextableChannel>) => {
        const config = buildCommands;

        interaction.createMessage(
            response.config.message({
                title: "Current Config",
                data: `\`\`\`${JSON.stringify(config, null, 4)}\`\`\``,
            }),
        );
    },
};
