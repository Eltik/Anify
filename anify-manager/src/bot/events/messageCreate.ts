import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, Events } from "discord.js";
import { client } from "..";
import channels from "../channels.json";
import configColors from "../colors.json";

let suggestion: any[] = [];

const botId = process.env.CLIENT ?? "";

export default client.on(Events.MessageCreate, async (message) => {
    if (message.channel.id === channels.suggestions && message.member?.id != botId) {
        const messageDelete = message.channel.messages.cache.get(suggestion[suggestion.length - 1]);
        suggestion = [];

        const avatarUrl = message.author.id && message.author.avatar ? `https://cdn.discordapp.com/avatars/${message.author.id}/${message.author.avatar}.png` : "https://i.waifu.pics/1y5O6HN.jpg";
        const suggestEmbed = new EmbedBuilder()
            .setColor(configColors.neutral as any)
            .setTitle("Suggestion By " + message.member?.user.tag)
            .setDescription(message.content)
            .setFooter({ text: message.member?.user.tag ?? "", iconURL: avatarUrl })
            .setTimestamp();
        const makeSuggestEmbed = new EmbedBuilder()
            .setColor(configColors.neutral as any)
            .setTitle("Make a Suggestion")
            .setDescription("You will have **10 minutes** to finish making your suggestion before the channel will lock for you. Please also make sure your suggestion has not been made before. Troll suggestions will get deleted!")
            .setFooter({ text: "Anify#7768", iconURL: "https://i.waifu.pics/1y5O6HN.jpg" })
            .setTimestamp();
        const suggestButton = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId("suggestion-" + message.id)
                .setLabel("Suggest Something")
                .setStyle(ButtonStyle.Success)
        );
        if (messageDelete != undefined) {
            messageDelete.delete();
        }
        message.channel.send({ embeds: [suggestEmbed] }).then((msg) => {
            message.channel.send({ embeds: [makeSuggestEmbed], components: [suggestButton as any] }).then((mssg) => {
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
            (message.channel as any).permissionOverwrites.edit(message.member?.id, { SendMessages: false });
        });
    }
});
