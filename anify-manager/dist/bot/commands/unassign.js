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
        .setName("unassign")
        .setDescription("Unassigns an API key to an user.")
        .addStringOption((option) => option.setName("master-key").setDescription("Master key").setRequired(true))
        .addStringOption((option) => option.setName("key").setDescription("The key to assign").setRequired(true)),
    async execute(interaction) {
        const master = interaction.options.get("master-key")?.value;
        const key = interaction.options.get("key")?.value;
        if (master != __1.masterKey) {
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(colors_json_1.default.error)
                .setDescription("You don't have permission to run this command!")
                .setTimestamp();
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        try {
            const { data } = await axios_1.default.get(`${__1.api}/unassign?key=${key}&apikey=${master}`).catch((err) => {
                return { data: { error: err.response?.data?.error ?? err.message } };
            });
            if (data.error) {
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor(colors_json_1.default.error)
                    .setDescription(JSON.stringify(data))
                    .setTimestamp();
                return await interaction.reply({ embeds: [embed], ephemeral: true });
            }
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(colors_json_1.default.success)
                .setDescription(`Successfully unassigned key \`${key}\`!`)
                .setTimestamp();
            await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        catch (e) {
            await interaction.reply("Error.");
        }
    },
};
