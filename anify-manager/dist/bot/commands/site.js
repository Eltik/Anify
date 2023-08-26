"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const colors_json_1 = __importDefault(require("../colors.json"));
const discord_js_1 = require("discord.js");
const embed = new discord_js_1.EmbedBuilder()
    .setColor(colors_json_1.default.neutral)
    .setTitle("Anify")
    .setDescription("Read an extensive library of manga and light novels or watch anime ad-free with customizable subtitles!\nhttps://anify.tv/")
    .setURL("https://anify.tv/")
    .setTimestamp();
exports.default = {
    data: new discord_js_1.SlashCommandBuilder().setName("site").setDescription("Link to the Anify website."),
    async execute(interaction) {
        await interaction.reply({ embeds: [embed] });
    },
};
