"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const colors_json_1 = __importDefault(require("../colors.json"));
const discord_js_1 = require("discord.js");
const axios_1 = __importDefault(require("axios"));
const __1 = require("..");
exports.default = {
    data: new discord_js_1.SlashCommandBuilder()
        .setName("keys")
        .setDescription("Gets API keys.")
        .addStringOption((option) => option.setName("key").setDescription("Master key").setRequired(true))
        .addIntegerOption((option) => option.setName("page").setDescription("Page to view")),
    async execute(interaction) {
        const key = interaction.options.get("key")?.value;
        let page = interaction.options.get("page")?.value ?? 1;
        if (key != __1.masterKey) {
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(colors_json_1.default.error)
                .setDescription("You don't have permission to run this command!")
                .setTimestamp();
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        try {
            const { data } = await axios_1.default.get(`${__1.api}/keys?apikey=${key}`);
            const pageSize = 5; // Number of items to display per page
            const totalPages = Math.ceil(data.length / pageSize);
            const pageContent = [];
            for (let i = 0; i < data.length; i += pageSize) {
                const pageKeys = data.slice(i, i + pageSize);
                let string = "";
                for (const item of pageKeys) {
                    if (string.length !== 0)
                        string += "======";
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
            if (page > totalPages)
                page = totalPages;
            page = Math.max(1, Math.min(page, totalPages)); // Ensure page number is within valid range
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(colors_json_1.default.neutral)
                .setTitle(`Admin Keys (Page ${page}/${totalPages})`)
                .setDescription(pageContent[page - 1])
                .setTimestamp();
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        catch (e) {
            console.error(e);
            await interaction.reply({ content: `Error executing command!`, ephemeral: true });
        }
    },
};
function formatKeys(keys) {
    let string = "";
    for (const item of keys) {
        if (string.length !== 0)
            string += "======";
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
