import { Events } from "discord.js";
import { client } from "..";
import colors from "colors";

export default client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = (interaction.client as any).commands.get(interaction.commandName);

    if (!command) {
        console.error(colors.red(`No command matching ${interaction.commandName} was found.`));
        return;
    }

    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(colors.red(`Error executing ${interaction.commandName}`));
        console.error(error);
    }
});
