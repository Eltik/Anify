"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const __1 = require("..");
const roles_json_1 = __importDefault(require("../roles.json"));
const colors_json_1 = __importDefault(require("../colors.json"));
const axios_1 = __importDefault(require("axios"));
const __2 = require("..");
const manager_1 = require("../../manager");
exports.default = __1.client.on(discord_js_1.Events.InteractionCreate, async (interaction) => {
    if (interaction.isButton()) {
        if (interaction.customId === "development-ping") {
            await interaction.deferReply({ ephemeral: true });
            const hasRole = await toggleRole(interaction.guild, interaction.member, roles_json_1.default.development_ping);
            if (hasRole === null) {
                const pingEmbed = new discord_js_1.EmbedBuilder()
                    .setColor(colors_json_1.default.error)
                    .setDescription("<@&" + roles_json_1.default.development_ping + "> role doesn't exist. Please contact a staff member.")
                    .setTimestamp();
                interaction.editReply({ embeds: [pingEmbed] });
                return;
            }
            if (!hasRole) {
                const pingEmbed = new discord_js_1.EmbedBuilder()
                    .setColor(colors_json_1.default.success)
                    .setDescription("Gave you the <@&" + roles_json_1.default.development_ping + "> role.")
                    .setTimestamp();
                interaction.editReply({ embeds: [pingEmbed] });
            }
            else {
                const pingEmbed = new discord_js_1.EmbedBuilder()
                    .setColor(colors_json_1.default.denied)
                    .setDescription("Removed the <@&" + roles_json_1.default.development_ping + "> role.")
                    .setTimestamp();
                interaction.editReply({ embeds: [pingEmbed] });
            }
        }
        if (interaction.customId === "scanlation-ping") {
            await interaction.deferReply({ ephemeral: true });
            const hasRole = await toggleRole(interaction.guild, interaction.member, roles_json_1.default.scanlation_ping);
            if (hasRole === null) {
                const pingEmbed = new discord_js_1.EmbedBuilder()
                    .setColor(colors_json_1.default.error)
                    .setDescription("<@&" + roles_json_1.default.scanlation_ping + "> role doesn't exist. Please contact a staff member.")
                    .setTimestamp();
                interaction.editReply({ embeds: [pingEmbed] });
                return;
            }
            if (!hasRole) {
                const pingEmbed = new discord_js_1.EmbedBuilder()
                    .setColor(colors_json_1.default.success)
                    .setDescription("Gave you the <@&" + roles_json_1.default.scanlation_ping + "> role.")
                    .setTimestamp();
                interaction.editReply({ embeds: [pingEmbed] });
            }
            else {
                const pingEmbed = new discord_js_1.EmbedBuilder()
                    .setColor(colors_json_1.default.denied)
                    .setDescription("Removed the <@&" + roles_json_1.default.scanlation_ping + "> role.")
                    .setTimestamp();
                interaction.editReply({ embeds: [pingEmbed] });
            }
        }
        if (interaction.customId === "announcement-ping") {
            await interaction.deferReply({ ephemeral: true });
            const hasRole = await toggleRole(interaction.guild, interaction.member, roles_json_1.default.announcement_ping);
            if (hasRole === null) {
                const pingEmbed = new discord_js_1.EmbedBuilder()
                    .setColor(colors_json_1.default.error)
                    .setDescription("<@&" + roles_json_1.default.announcement_ping + "> role doesn't exist. Please contact a staff member.")
                    .setTimestamp();
                interaction.editReply({ embeds: [pingEmbed] });
                return;
            }
            if (!hasRole) {
                const pingEmbed = new discord_js_1.EmbedBuilder()
                    .setColor(colors_json_1.default.success)
                    .setDescription("Gave you the <@&" + roles_json_1.default.announcement_ping + "> role.")
                    .setTimestamp();
                interaction.editReply({ embeds: [pingEmbed] });
            }
            else {
                const pingEmbed = new discord_js_1.EmbedBuilder()
                    .setColor(colors_json_1.default.denied)
                    .setDescription("Removed the <@&" + roles_json_1.default.announcement_ping + "> role.")
                    .setTimestamp();
                interaction.editReply({ embeds: [pingEmbed] });
            }
        }
        if (interaction.customId.includes("suggest")) {
            await interaction.deferReply({ ephemeral: true });
            const time = 600000;
            let timeTill = Date.now() / 1000;
            timeTill += parseInt(String(time / 1000));
            const suggestEmbed = new discord_js_1.EmbedBuilder()
                .setColor(colors_json_1.default.success)
                .setDescription("Make your suggestion now! You have until <t:" + timeTill + ":R> to make your suggestion.")
                .setTimestamp();
            await interaction.editReply({ embeds: [suggestEmbed] });
            interaction.channel.permissionOverwrites.edit(interaction.member.id, { SendMessages: true });
            setTimeout(() => {
                interaction.channel.permissionOverwrites.edit(interaction.member.id, { SendMessages: false });
            }, time);
        }
        if (interaction.customId.includes("getkey")) {
            await interaction.deferReply({ ephemeral: true });
            const { data } = await axios_1.default.get(`${__2.api}/key?id=${interaction.member?.user.id}&apikey=${__2.masterKey}`).catch((err) => {
                return { data: { error: err.response?.data?.error ?? err.message } };
            });
            if (data.error) {
                // Generate key
                const key = await (0, manager_1.generateKey)();
                const { data } = await axios_1.default.get(`${__2.api}/assign?id=${interaction.member?.user.id}&key=${key}&apikey=${__2.masterKey}`).catch((err) => {
                    return { data: { error: err.response?.data?.error ?? err.message } };
                });
                if (data.error) {
                    // Return error
                    const errorEmbed = new discord_js_1.EmbedBuilder()
                        .setColor(colors_json_1.default.error)
                        .setDescription(`An error has occurred! Please contact a staff member. Error: \`${data.error}\``)
                        .setTimestamp();
                    await interaction.editReply({ embeds: [errorEmbed] });
                    return;
                }
                const keyEmbed = new discord_js_1.EmbedBuilder()
                    .setColor(colors_json_1.default.success)
                    .setDescription(`Your key is \`${key}\`! You can run **/get** to display your current key.`)
                    .setTimestamp();
                await interaction.editReply({ embeds: [keyEmbed] });
                return;
            }
            const embed = new discord_js_1.EmbedBuilder()
                .setColor(colors_json_1.default.error)
                .setDescription(`You already have a key! Key: \`${data.key}\``)
                .setTimestamp();
            await interaction.editReply({ embeds: [embed] });
        }
    }
});
async function toggleRole(guild, member, id) {
    return new Promise(async function (resolve, reject) {
        const role = guild.roles.cache.get(id);
        if (!role) {
            resolve(null);
            return;
        }
        if (!member.roles.cache.has(role.id)) {
            member.roles.add(role);
            resolve(false);
        }
        else {
            member.roles.remove(role);
            resolve(true);
        }
    });
}
