import * as response from "../../responses/anify";
import { kill, list } from "../../../utils/pm2";
import run from "./run";
import { Client, CommandInteraction, ComponentInteraction, Constants, TextableChannel } from "eris";

const logic = async () => {
    const { data } = await list();
    // remove element if name = "discord-bot"
    const index = data.findIndex((x) => x.name == "discord-bot");
    if (index > -1) data.splice(index, 1);

    if (!data.length) return response.viewRunningRepo.error.message("No **Running** Scripts found!");
    return response.viewRunningRepo.message(data.map((x) => x.name || "N/A"));
};

export default {
    name: "running",
    schema: {
        name: "running",
        description: "View the current running processes of PM2.",
        type: Constants.ApplicationCommandTypes.CHAT_INPUT,
    },
    logic: logic,
    on: async (client: Client, interaction: CommandInteraction<TextableChannel>) => {
        await interaction.createMessage(await logic());
    },
    onInteraction: async (client: Client, interaction: ComponentInteraction<TextableChannel>) => {
        if (interaction.data.component_type === 2) {
            if (interaction.data.custom_id === "kato-run") {
                return await interaction.createMessage(await run.logic());
            }

            const [data] = await kill(interaction.data.custom_id);
            if (data.error) return interaction.createMessage(response.stopRepo.error.message(data.error as string));

            // update original message
            await interaction.editParent(await logic());
        }
    },
};
