import config from "../colors.json";
import { CommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";

const embed = new EmbedBuilder()
    .setColor(config.neutral as any)
    .setTitle("Anify")
    .setDescription("Read an extensive library of manga and light novels or watch anime ad-free with customizable subtitles!\nhttps://anify.tv/")
    .setURL("https://anify.tv/")
    .setTimestamp();

export default {
    data: new SlashCommandBuilder().setName("site").setDescription("Link to the Anify website."),
    async execute(interaction: CommandInteraction) {
        await interaction.reply({ embeds: [embed] });
    },
};
