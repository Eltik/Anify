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
        .setName("update")
        .setDescription("Updates API keys.")
        .addStringOption((option) => option.setName("key").setDescription("Master key").setRequired(true)),
    async execute(interaction) {
        const key = interaction.options.get("key")?.value;
        if (key != __1.masterKey) {
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(colors_json_1.default.error)
                .setDescription("You don't have permission to run this command!")
                .setTimestamp();
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        try {
            const { data } = await axios_1.default.get(`${__1.api}/update-keys?apikey=${key}`);
            if (data.success === "true") {
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor(colors_json_1.default.neutral)
                    .setDescription("Success!")
                    .setTimestamp();
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
            else {
                const embed = new discord_js_1.EmbedBuilder()
                    .setColor(colors_json_1.default.neutral)
                    .setDescription("Error updating keys." + "\n" + data)
                    .setTimestamp();
                await interaction.reply({ embeds: [embed], ephemeral: true });
            }
        }
        catch (e) {
            await interaction.reply("Error.");
        }
    },
};
