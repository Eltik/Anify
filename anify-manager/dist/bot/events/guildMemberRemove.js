"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const __1 = require("..");
exports.default = __1.client.on(discord_js_1.Events.GuildMemberRemove, async (member) => {
    console.log(member.user.tag + " left the server.".dim);
});
