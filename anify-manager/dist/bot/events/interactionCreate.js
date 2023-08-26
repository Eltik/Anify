"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord_js_1 = require("discord.js");
const __1 = require("..");
const colors_1 = __importDefault(require("colors"));
exports.default = __1.client.on(discord_js_1.Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand())
        return;
    const command = interaction.client.commands.get(interaction.commandName);
    if (!command) {
        console.error(colors_1.default.red(`No command matching ${interaction.commandName} was found.`));
        return;
    }
    try {
        await command.execute(interaction);
    }
    catch (error) {
        console.error(colors_1.default.red(`Error executing ${interaction.commandName}`));
        console.error(error);
    }
});
