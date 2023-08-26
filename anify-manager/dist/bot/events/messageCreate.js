"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const __1 = require("..");
const channels_json_1 = __importDefault(require("../channels.json"));
const colors_json_1 = __importDefault(require("../colors.json"));
let suggestion = [];
const botId = process.env.CLIENT ?? "";
exports.default = __1.client.on(discord_js_1.Events.MessageCreate, async (message) => {
    if (message.channel.id === channels_json_1.default.suggestions && message.member?.id != botId) {
        const messageDelete = message.channel.messages.cache.get(suggestion[suggestion.length - 1]);
        suggestion = [];
        const avatarUrl = message.author.id && message.author.avatar ? `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png` : "https://i.waifu.pics/1y5O6HN.jpg";
        const suggestEmbed = new discord_js_1.EmbedBuilder()
            .setColor(colors_json_1.default.neutral)
            .setTitle("Suggestion By " + message.member?.user.tag)
            .setDescription(message.content)
            .setFooter({ text: message.member?.user.tag ?? "", iconURL: avatarUrl })
            .setTimestamp();
        const makeSuggestEmbed = new discord_js_1.EmbedBuilder()
            .setColor(colors_json_1.default.neutral)
            .setTitle("Make a Suggestion")
            .setDescription("You will have **10 minutes** to finish making your suggestion before the channel will lock for you. Please also make sure your suggestion has not been made before. Troll suggestions will get deleted!")
            .setFooter({ text: "Anify#7768", iconURL: "https://i.waifu.pics/1y5O6HN.jpg" })
            .setTimestamp();
        const suggestButton = new discord_js_1.ActionRowBuilder().addComponents(new discord_js_1.ButtonBuilder()
            .setCustomId("suggestion-" + message.id)
            .setLabel("Suggest Something")
            .setStyle(discord_js_1.ButtonStyle.Success));
        if (messageDelete != undefined) {
            messageDelete.delete();
        }
        message.channel.send({ embeds: [suggestEmbed] }).then((msg) => {
            message.channel.send({ embeds: [makeSuggestEmbed], components: [suggestButton] }).then((mssg) => {
                suggestion.push(mssg.id);
            });
            message.delete();
            message.channel.messages.fetch(msg.id).then((mssg) => {
                if (!mssg) {
                    return;
                }
                mssg.react("👍");
                mssg.react("👎");
            });
            message.channel.permissionOverwrites.edit(message.member?.id, { SendMessages: false });
        });
    }
});
