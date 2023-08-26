"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a, _b, _c;
Object.defineProperty(exports, "__esModule", { value: true });
exports.login = exports.loadEvents = exports.loadCommands = exports.registerCommands = exports.client = exports.frontend = exports.auth = exports.api = exports.masterKey = void 0;
// Require the necessary discord.js classes
const discord_js_1 = require("discord.js");
const colors_1 = __importDefault(require("colors"));
const fs_1 = require("fs");
const path_1 = require("path");
const token = process.env.TOKEN ?? "";
const clientId = process.env.CLIENT ?? "";
const guildId = process.env.GUILD ?? "";
exports.masterKey = process.env.MASTER_KEY ?? "";
exports.api = process.env.API ?? "";
exports.auth = process.env.AUTH ?? "";
exports.frontend = process.env.FRONTEND ?? "";
exports.client = new discord_js_1.Client({
    shards: "auto",
    allowedMentions: {
        parse: [],
        repliedUser: true,
    },
    intents: [discord_js_1.GatewayIntentBits.GuildMembers, discord_js_1.GatewayIntentBits.Guilds, discord_js_1.GatewayIntentBits.GuildMessages, discord_js_1.GatewayIntentBits.GuildVoiceStates, discord_js_1.GatewayIntentBits.GuildMessageReactions, discord_js_1.GatewayIntentBits.MessageContent],
    presence: {
        activities: [{ name: "Anime", type: discord_js_1.ActivityType.Watching }],
        status: "online",
    },
    partials: [discord_js_1.Partials.Message, discord_js_1.Partials.Channel, discord_js_1.Partials.Reaction, discord_js_1.Partials.GuildMember],
});
async function registerCommands() {
    const commands = [];
    const rest = new discord_js_1.REST().setToken(token);
    const existingCommands = await rest.get(discord_js_1.Routes.applicationGuildCommands(clientId, guildId));
    existingCommands.forEach((command) => {
        commands.push(command);
        console.log(colors_1.default.gray("Registered ") + colors_1.default.blue(`/${command.name}`) + colors_1.default.gray("."));
    });
    for (const file of (0, fs_1.readdirSync)((0, path_1.join)(__dirname, "./commands"))) {
        const filePath = (0, path_1.join)((0, path_1.join)(__dirname, "./commands"), file);
        const { default: command } = await (_a = filePath, Promise.resolve().then(() => __importStar(require(_a))));
        // Set a new item in the Collection with the key as the command name and the value as the exported module
        if ("data" in command && "execute" in command) {
            let canPush = true;
            for (let i = 0; i < existingCommands.length; i++) {
                if (command.data.name === existingCommands[i].name) {
                    console.log(colors_1.default.yellow(`[WARNING] The command at ${filePath} is already registered. Skipping...`));
                    canPush = false;
                    break;
                }
            }
            if (canPush) {
                commands.push(command.data.toJSON());
                console.log(colors_1.default.gray("Registered ") + colors_1.default.blue(`/${command.data.name}`) + colors_1.default.gray("."));
            }
        }
        else {
            console.log(colors_1.default.yellow(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`));
        }
    }
    // If there are new commands to register
    if (commands.length > 0) {
        try {
            console.log(colors_1.default.yellow(`Started refreshing ${commands.length} application (/) commands.`));
            // The post method is used to create new commands without overwriting existing ones
            const data = await rest.put(discord_js_1.Routes.applicationGuildCommands(clientId, guildId), { body: commands });
            console.log(colors_1.default.green(`Successfully registered ${data.length} new application (/) commands.`));
        }
        catch (error) {
            console.error(error);
        }
    }
    else {
        console.log(colors_1.default.gray("No new commands to register."));
    }
}
exports.registerCommands = registerCommands;
async function loadCommands() {
    exports.client.commands = new discord_js_1.Collection();
    for (const file of (0, fs_1.readdirSync)((0, path_1.join)(__dirname, "./commands"))) {
        const filePath = (0, path_1.join)((0, path_1.join)(__dirname, "./commands"), file);
        const { default: command } = await (_b = filePath, Promise.resolve().then(() => __importStar(require(_b))));
        // Set a new item in the Collection with the key as the command name and the value as the exported module
        if ("data" in command && "execute" in command) {
            exports.client.commands.set(command.data.name, command);
            console.log(colors_1.default.gray("Registered command ") + colors_1.default.blue(`/${command.data.name}`) + colors_1.default.gray("."));
        }
    }
}
exports.loadCommands = loadCommands;
async function loadEvents() {
    for (const file of (0, fs_1.readdirSync)((0, path_1.join)(__dirname, "./events"))) {
        const filePath = (0, path_1.join)((0, path_1.join)(__dirname, "./events"), file);
        await (_c = filePath, Promise.resolve().then(() => __importStar(require(_c))));
        console.log(colors_1.default.gray("Registered event ") + colors_1.default.blue(`${file}`) + colors_1.default.gray("."));
    }
}
exports.loadEvents = loadEvents;
async function login() {
    await exports.client.login(token);
}
exports.login = login;
