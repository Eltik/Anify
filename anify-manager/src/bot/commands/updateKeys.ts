import config from "../colors.json";
import { CommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import axios from "axios";
import { api, masterKey } from "..";

export default {
    data: new SlashCommandBuilder()
        .setName("update")
        .setDescription("Updates API keys.")
        .addStringOption((option) => option.setName("key").setDescription("Master key").setRequired(true)),
    async execute(interaction: CommandInteraction) {
        const key = interaction.options.get("key")?.value;

        if (key != masterKey) {
            const embed = new EmbedBuilder()
                .setColor(config.error as any)
                .setDescription("You don't have permission to run this command!")
                .setTimestamp();
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        try {
            const { data } = await axios.get(`${api}/update-keys?apikey=${key}`);

            if (data.success === "true") {
                const embed = new EmbedBuilder()
                    .setColor(config.neutral as any)
                    .setDescription("Success!")
                    .setTimestamp();
                await interaction.reply({ embeds: [embed], ephemeral: true });
            } else {
                const embed = new EmbedBuilder()
                    .setColor(config.neutral as any)
                    .setDescription("Error updating keys." + "\n" + data)
                    .setTimestamp();
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        } catch (e) {
            await interaction.reply("Error.");
        }
    },
};
