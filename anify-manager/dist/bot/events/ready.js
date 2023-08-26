"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const __1 = require("..");
const colors_1 = __importDefault(require("colors"));
exports.default = __1.client.once(discord_js_1.Events.ClientReady, (c) => {
    console.log(colors_1.default.green(`Ready! Logged in as ${c.user.tag}`));
});
