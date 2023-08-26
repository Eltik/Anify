import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, TextChannel } from "discord.js";
import { client } from "..";
import configColor from "../colors.json";
import channels from "../channels.json";
import axios from "axios";

const frontend = process.env.FRONTEND ?? "";
const api = process.env.API ?? "";
const auth = process.env.AUTH ?? "";

const updateStatusEmbed = async () => {
    const channelId = channels.status; // Replace with your channel ID
    const channel = await client.channels.fetch(channelId);

    const req1 = await axios(frontend).catch((err) => {
        return null;
    });
    const req2 = await axios(api).catch((err) => {
        return null;
    });
    const req3 = await axios(auth).catch((err) => {
        return null;
    });

    const statusEmbed = new EmbedBuilder()
        .setColor(configColor.neutral as any)
        .setTitle("Status")
        .setDescription(`**Frontend**: ${req1 ? "✅" : "❌"}\n**Backend**: ${req2 ? "✅" : "❌"}\n**Authentication**: ${req3 ? "✅" : "❌"}`);

    if (!channel) {
        console.error("Channel not found.");
        return;
    }

    if (channel instanceof TextChannel) {
        const messages = await channel.messages.fetch();
        const lastMessage = messages.first();

        if (lastMessage && lastMessage.author.id === client.user?.id) {
            await lastMessage.edit({ embeds: [statusEmbed] });
        } else {
            await channel.send({ embeds: [statusEmbed] });
        }
    }
};

const createKeyButtons = async () => {
    const channelId = channels.api; // Replace with your channel ID
    const channel = await client.channels.fetch(channelId);

    const keyEmbed = new EmbedBuilder()
        .setColor(configColor.neutral as any)
        .setTitle("Get API Key")
        .setDescription("Get your own API key for development! API documentation can be viewed [here](https://docs.anify.tv). Only one API key can be generated per user. Abusing this system will result in a permanent ban from the API.");

    const keyButton = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId("getkey").setLabel("Get Key").setStyle(ButtonStyle.Primary));

    if (!channel) {
        console.error("Channel not found.");
        return;
    }

    if (channel instanceof TextChannel) {
        const messages = await channel.messages.fetch();
        const lastMessage = messages.first();

        if (lastMessage && lastMessage.author.id === client.user?.id) {
            return;
        } else {
            await channel.send({ embeds: [keyEmbed], components: [keyButton as any] });
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

export default runStatusEmbed();
