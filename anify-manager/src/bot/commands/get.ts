import config from "../colors.json";
import { CommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import axios from "axios";
import { api, masterKey } from "..";

export default {
    data: new SlashCommandBuilder().setName("get").setDescription("Gets your personal API key."),
    async execute(interaction: CommandInteraction) {
        try {
            const { data } = await axios.get(`${api}/key?id=${interaction.member?.user.id}&apikey=${masterKey}`).catch((err) => {
                return { data: { error: err.response?.data?.error ?? err.message } };
            });

            if (data.error) {
                const embed = new EmbedBuilder()
                    .setColor(config.error as any)
                    .setDescription(JSON.stringify(data))
                    .setTimestamp();

                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }

            const string = `
            **Key**: \`${data.key}\`
            **Request Count**: \`${data.requestCount}\`
            **Created At**: \`${data.createdAt}\`
            **Updated At**: \`${data.updatedAt}\`
            `;

            const embed = new EmbedBuilder()
                .setColor(config.neutral as any)
                .setDescription(string)
                .setTimestamp();
            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (e) {
            console.error(e);
            await interaction.reply("Error.");
        }
    },
};
