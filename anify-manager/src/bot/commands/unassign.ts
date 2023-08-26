import config from "../colors.json";
import { CommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import axios from "axios";
import { api, masterKey } from "..";

export default {
    data: new SlashCommandBuilder()
        .setName("unassign")
        .setDescription("Unassigns an API key to an user.")
        .addStringOption((option) => option.setName("master-key").setDescription("Master key").setRequired(true))
        .addStringOption((option) => option.setName("key").setDescription("The key to assign").setRequired(true)),
    async execute(interaction: CommandInteraction) {
        const master = interaction.options.get("master-key")?.value;
        const key = interaction.options.get("key")?.value;

        if (master != masterKey) {
            const embed = new EmbedBuilder()
                .setColor(config.error as any)
                .setDescription("You don't have permission to run this command!")
                .setTimestamp();
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        try {
            const { data } = await axios.get(`${api}/unassign?key=${key}&apikey=${master}`).catch((err) => {
                return { data: { error: err.response?.data?.error ?? err.message } };
            });

            if (data.error) {
                const embed = new EmbedBuilder()
                    .setColor(config.error as any)
                    .setDescription(JSON.stringify(data))
                    .setTimestamp();

                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const embed = new EmbedBuilder()
                .setColor(config.success as any)
                .setDescription(`Successfully unassigned key \`${key}\`!`)
                .setTimestamp();
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (e) {
            await interaction.reply("Error.");
        }
    },
};
