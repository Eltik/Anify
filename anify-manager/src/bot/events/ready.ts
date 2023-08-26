import { Events } from "discord.js";
import { client } from "..";
import colors from "colors";

export default client.once(Events.ClientReady, (c) => {
    console.log(colors.green(`Ready! Logged in as ${c.user.tag}`));
});
