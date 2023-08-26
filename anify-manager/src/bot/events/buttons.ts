import { EmbedBuilder, Events } from "discord.js";
import { client } from "..";
import config from "../roles.json";
import colorConfig from "../colors.json";
import axios from "axios";
import { api, masterKey } from "..";
import { generateKey } from "@/src/manager";

export default client.on(Events.InteractionCreate, async (interaction) => {
    if (interaction.isButton()) {
        if (interaction.customId === "development-ping") {
            await interaction.deferReply({ ephemeral: true });
            const hasRole = await toggleRole(interaction.guild, interaction.member, config.development_ping);
            if (hasRole === null) {
                const pingEmbed = new EmbedBuilder()
                    .setColor(colorConfig.error as any)
                    .setDescription("<@&" + config.development_ping + "> role doesn't exist. Please contact a staff member.")
                    .setTimestamp();
                interaction.editReply({ embeds: [pingEmbed] });
                return;
            }
            if (!hasRole) {
                const pingEmbed = new EmbedBuilder()
                    .setColor(colorConfig.success as any)
                    .setDescription("Gave you the <@&" + config.development_ping + "> role.")
                    .setTimestamp();
                interaction.editReply({ embeds: [pingEmbed] });
            } else {
                const pingEmbed = new EmbedBuilder()
                    .setColor(colorConfig.denied as any)
                    .setDescription("Removed the <@&" + config.development_ping + "> role.")
                    .setTimestamp();
                interaction.editReply({ embeds: [pingEmbed] });
            }
        }

        if (interaction.customId === "scanlation-ping") {
            await interaction.deferReply({ ephemeral: true });
            const hasRole = await toggleRole(interaction.guild, interaction.member, config.scanlation_ping);
            if (hasRole === null) {
                const pingEmbed = new EmbedBuilder()
                    .setColor(colorConfig.error as any)
                    .setDescription("<@&" + config.scanlation_ping + "> role doesn't exist. Please contact a staff member.")
                    .setTimestamp();
                interaction.editReply({ embeds: [pingEmbed] });
                return;
            }
            if (!hasRole) {
                const pingEmbed = new EmbedBuilder()
                    .setColor(colorConfig.success as any)
                    .setDescription("Gave you the <@&" + config.scanlation_ping + "> role.")
                    .setTimestamp();
                interaction.editReply({ embeds: [pingEmbed] });
            } else {
                const pingEmbed = new EmbedBuilder()
                    .setColor(colorConfig.denied as any)
                    .setDescription("Removed the <@&" + config.scanlation_ping + "> role.")
                    .setTimestamp();
                interaction.editReply({ embeds: [pingEmbed] });
            }
        }

        if (interaction.customId === "announcement-ping") {
            await interaction.deferReply({ ephemeral: true });
            const hasRole = await toggleRole(interaction.guild, interaction.member, config.announcement_ping);
            if (hasRole === null) {
                const pingEmbed = new EmbedBuilder()
                    .setColor(colorConfig.error as any)
                    .setDescription("<@&" + config.announcement_ping + "> role doesn't exist. Please contact a staff member.")
                    .setTimestamp();
                interaction.editReply({ embeds: [pingEmbed] });
                return;
            }
            if (!hasRole) {
                const pingEmbed = new EmbedBuilder()
                    .setColor(colorConfig.success as any)
                    .setDescription("Gave you the <@&" + config.announcement_ping + "> role.")
                    .setTimestamp();
                interaction.editReply({ embeds: [pingEmbed] });
            } else {
                const pingEmbed = new EmbedBuilder()
                    .setColor(colorConfig.denied as any)
                    .setDescription("Removed the <@&" + config.announcement_ping + "> role.")
                    .setTimestamp();
                interaction.editReply({ embeds: [pingEmbed] });
            }
        }

        if (interaction.customId.includes("suggest")) {
            await interaction.deferReply({ ephemeral: true });
            const time = 600000;
            let timeTill = Date.now() / 1000;
            timeTill += parseInt(String(time / 1000));

            const suggestEmbed = new EmbedBuilder()
                .setColor(colorConfig.success as any)
                .setDescription("Make your suggestion now! You have until <t:" + timeTill + ":R> to make your suggestion.")
                .setTimestamp();
            await interaction.editReply({ embeds: [suggestEmbed] });
            (interaction.channel as any).permissionOverwrites.edit((interaction.member as any).id, { SendMessages: true });
            setTimeout(() => {
                (interaction.channel as any).permissionOverwrites.edit((interaction.member as any).id, { SendMessages: false });
            }, time);
        }

        if (interaction.customId.includes("getkey")) {
            await interaction.deferReply({ ephemeral: true });

            const { data } = await axios.get(`${api}/key?id=${interaction.member?.user.id}&apikey=${masterKey}`).catch((err) => {
                return { data: { error: err.response?.data?.error ?? err.message } };
            });

            if (data.error) {
                // Generate key
                const key = await generateKey();

                const { data } = await axios.get(`${api}/assign?id=${interaction.member?.user.id}&key=${key}&apikey=${masterKey}`).catch((err) => {
                    return { data: { error: err.response?.data?.error ?? err.message } };
                });

                if (data.error) {
                    // Return error
                    const errorEmbed = new EmbedBuilder()
                        .setColor(colorConfig.error as any)
                        .setDescription(`An error has occurred! Please contact a staff member. Error: \`${data.error}\``)
                        .setTimestamp();
                    await interaction.editReply({ embeds: [errorEmbed] });
                    return;
                }

                const keyEmbed = new EmbedBuilder()
                    .setColor(colorConfig.success as any)
                    .setDescription(`Your key is \`${key}\`! You can run **/get** to display your current key.`)
                    .setTimestamp();
                await interaction.editReply({ embeds: [keyEmbed] });
                return;
            }

            const embed = new EmbedBuilder()
                .setColor(colorConfig.error as any)
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
        } else {
            member.roles.remove(role);
            resolve(true);
        }
    });
}
