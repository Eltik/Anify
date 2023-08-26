import config from "../colors.json";
import { CommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import axios from "axios";
import { api, masterKey } from "..";

export default {
    data: new SlashCommandBuilder()
        .setName("keys")
        .setDescription("Gets API keys.")
        .addStringOption((option) => option.setName("key").setDescription("Master key").setRequired(true))
        .addIntegerOption((option) => option.setName("page").setDescription("Page to view")),
    async execute(interaction: CommandInteraction) {
        const key = interaction.options.get("key")?.value;
        let page = (interaction.options.get("page")?.value as number) ?? 1;

        if (key != masterKey) {
            const embed = new EmbedBuilder()
                .setColor(config.error as any)
                .setDescription("You don't have permission to run this command!")
                .setTimestamp();
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }

        try {
            const { data } = await axios.get(`${api}/keys?apikey=${key}`);

            const pageSize = 5; // Number of items to display per page
            const totalPages = Math.ceil(data.length / pageSize);

            const pageContent: string[] = [];

            for (let i = 0; i < data.length; i += pageSize) {
                const pageKeys = data.slice(i, i + pageSize);
                let string = "";

                for (const item of pageKeys) {
                    if (string.length !== 0) string += "======";
                    string += `
                    **User**: <@${item.id}>
                    **Key**: \`${item.key}\`
                    **Request Count**: \`${item.requestCount}\`
                    **Created At**: \`${item.createdAt}\`
                    **Updated At**: \`${item.updatedAt}\`
                    `;
                }

                pageContent.push(string);
            }

            if (page > totalPages) page = totalPages;

            page = Math.max(1, Math.min(page, totalPages)); // Ensure page number is within valid range

            const embed = new EmbedBuilder()
                .setColor(config.neutral as any)
                .setTitle(`Admin Keys (Page ${page}/${totalPages})`)
                .setDescription(pageContent[page - 1])
                .setTimestamp();

            await interaction.reply({ embeds: [embed], ephemeral: true });
        } catch (e) {
            console.error(e);
            await interaction.reply({ content: `Error executing command!`, ephemeral: true });
        }
    },
};

function formatKeys(keys) {
    let string = "";
    for (const item of keys) {
        if (string.length !== 0) string += "======";
        string += `
        **User**: <@${item.id}>
        **Key**: \`${item.key}\`
        **Request Count**: \`${item.requestCount}\`
        **Created At**: \`${item.createdAt}\`
        **Updated At**: \`${item.updatedAt}\`
        `;
    }
    return string;
}
