import { Events } from "discord.js";
import { client } from "..";
import colors from "colors";

export default client.on(Events.GuildMemberRemove, async (member) => {
    console.log(member.user.tag + " left the server.".dim);
});
