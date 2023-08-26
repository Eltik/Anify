import { Events } from "discord.js";
import { client } from "..";
import colors from "colors";
import config from "../roles.json";

export default client.on(Events.GuildMemberAdd, async (member) => {
    const role = member.guild.roles.cache.find((role) => role.id === config.guest);
    if (!role) {
        return;
    }
    member.roles.add(role);
    console.log(member.user.tag + " joined the server.".dim);
});
