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
    data: new discord_js_1.SlashCommandBuilder().setName("get").setDescription("Gets your personal API key."),
    async execute(interaction) {
        try {
            const { data } = await axios_1.default.get(`${__1.api}/key?id=${interaction.member?.user.id}&apikey=${__1.masterKey}`).catch((err) => {
                return { data: { error: err.response?.data?.error ?? err.message } };
            });
            if (data.error) {
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor(colors_json_1.default.error)
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
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(colors_json_1.default.neutral)
                .setDescription(string)
                .setTimestamp();
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        catch (e) {
            console.error(e);
            await interaction.reply("Error.");
        }
    },
};
