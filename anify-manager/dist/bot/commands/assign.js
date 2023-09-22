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
        .setName("assign")
        .setDescription("Assigns an API key to an user.")
        .addUserOption((option) => option.setName("user").setDescription("The user to assign the API key to").setRequired(true))
        .addStringOption((option) => option.setName("master-key").setDescription("Master key").setRequired(true))
        .addStringOption((option) => option.setName("key").setDescription("The key to assign").setRequired(true)),
    async execute(interaction) {
        const user = interaction.options.getUser("user");
        const master = interaction.options.get("master-key")?.value;
        const key = interaction.options.get("key")?.value;
        if (master != __1.masterKey) {
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(colors_json_1.default.error)
                .setDescription("You don't have permission to run this command!")
                .setTimestamp();
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        if (!user) {
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(colors_json_1.default.error)
                .setDescription("You didn't specify a user!")
                .setTimestamp();
            return await interaction.reply({ embeds: [embed], ephemeral: true });
        }
        try {
            const { data } = await axios_1.default.get(`${__1.api}/assign?id=${user.id}&key=${key}&apikey=${master}`).catch((err) => {
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
                .setDescription(`Successfully assigned key \`${key}\` to <@${user.id}>!`)
                .setTimestamp();
            await interaction.reply({ embeds: [embed], ephemeral: true });
            await user.send(`Your API key has been assigned to \`${key}\`!`).catch((err) => {
                interaction.channel?.send(`Failed to DM <@${user.id}>!`);
            });
        }
        catch (e) {
            console.error(e);
            await interaction.channel?.send("Error.");
        }
    },
};