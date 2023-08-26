import config from "../colors.json";
import { CommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import axios from "axios";
import { api, masterKey } from "..";

export default {
    data: new SlashCommandBuilder()
        .setName("assign")
        .setDescription("Assigns an API key to an user.")
        .addUserOption((option) => option.setName("user").setDescription("The user to assign the API key to").setRequired(true))
        .addStringOption((option) => option.setName("master-key").setDescription("Master key").setRequired(true))
        .addStringOption((option) => option.setName("key").setDescription("The key to assign").setRequired(true)),
    async execute(interaction: CommandInteraction) {
        const user = interaction.options.getUser("user");
        const master = interaction.options.get("master-key")?.value;
        const key = interaction.options.get("key")?.value;

        if (master != masterKey) {
            const embed = new EmbedBuilder()
                .setColor(config.error as any)
                .setDescription("You don't have permission to run this command!")
                .setTimestamp();
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        if (!user) {
            const embed = new EmbedBuilder()
                .setColor(config.error as any)
                .setDescription("You didn't specify a user!")
                .setTimestamp();
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        try {
            const { data } = await axios.get(`${api}/assign?id=${user.id}&key=${key}&apikey=${master}`).catch((err) => {
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
                .setDescription(`Successfully assigned key \`${key}\` to <@${user.id}>!`)
                .setTimestamp();
            await interaction.reply({ embeds: [embed], ephemeral: true });

            await user.send(`Your API key has been assigned to \`${key}\`!`).catch((err) => {
                interaction.channel?.send(`Failed to DM <@${user.id}>!`);
            });
        } catch (e) {
            console.error(e);
            await interaction.channel?.send("Error.");
        }
    },
};
