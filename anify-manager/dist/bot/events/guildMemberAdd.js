"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const __1 = require("..");
const roles_json_1 = __importDefault(require("../roles.json"));
exports.default = __1.client.on(discord_js_1.Events.GuildMemberAdd, async (member) => {
    const role = member.guild.roles.cache.find((role) => role.id === roles_json_1.default.guest);
    if (!role) {
        return;
    }
    member.roles.add(role);
    console.log(member.user.tag + " joined the server.".dim);
});
