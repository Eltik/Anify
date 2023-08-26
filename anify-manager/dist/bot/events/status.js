"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const __1 = require("..");
const colors_json_1 = __importDefault(require("../colors.json"));
const channels_json_1 = __importDefault(require("../channels.json"));
const axios_1 = __importDefault(require("axios"));
const frontend = process.env.FRONTEND ?? "";
const api = process.env.API ?? "";
const auth = process.env.AUTH ?? "";
const updateStatusEmbed = async () => {
    const channelId = channels_json_1.default.status; // Replace with your channel ID
    const channel = await __1.client.channels.fetch(channelId);
    const req1 = await (0, axios_1.default)(frontend).catch((err) => {
        return null;
    });
    const req2 = await (0, axios_1.default)(api).catch((err) => {
        return null;
    });
    const req3 = await (0, axios_1.default)(auth).catch((err) => {
        return null;
    });
    const statusEmbed = new discord_js_1.EmbedBuilder()
        .setColor(colors_json_1.default.neutral)
        .setTitle("Status")
        .setDescription(`**Frontend**: ${req1 ? "✅" : "❌"}\n**Backend**: ${req2 ? "✅" : "❌"}\n**Authentication**: ${req3 ? "✅" : "❌"}`);
    if (!channel) {
        console.error("Channel not found.");
        return;
    }
    if (channel instanceof discord_js_1.TextChannel) {
        const messages = await channel.messages.fetch();
        const lastMessage = messages.first();
        if (lastMessage && lastMessage.author.id === __1.client.user?.id) {
            await lastMessage.edit({ embeds: [statusEmbed] });
        }
        else {
            await channel.send({ embeds: [statusEmbed] });
        }
    }
};
const createKeyButtons = async () => {
    const channelId = channels_json_1.default.api; // Replace with your channel ID
    const channel = await __1.client.channels.fetch(channelId);
    const keyEmbed = new discord_js_1.EmbedBuilder()
        .setColor(colors_json_1.default.neutral)
        .setTitle("Get API Key")
        .setDescription("Get your own API key for development! API documentation can be viewed [here](https://docs.anify.tv). Only one API key can be generated per user. Abusing this system will result in a permanent ban from the API.");
    const keyButton = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder().setCustomId("getkey").setLabel("Get Key").setStyle(discord_js_1.ButtonStyle.Primary));
    if (!channel) {
        console.error("Channel not found.");
        return;
    }
    if (channel instanceof discord_js_1.TextChannel) {
        const messages = await channel.messages.fetch();
        const lastMessage = messages.first();
        if (lastMessage && lastMessage.author.id === __1.client.user?.id) {
            return;
        }
        else {
            await channel.send({ embeds: [keyEmbed], components: [keyButton] });
        }
    }
};
async function runStatusEmbed() {
    setTimeout(async () => {
        await updateStatusEmbed();
        await createKeyButtons();
        setInterval(() => {
            updateStatusEmbed();
            createKeyButtons();
        }, 300000);
    }, 10000);
}
exports.default = runStatusEmbed();
