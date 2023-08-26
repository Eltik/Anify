// Require the necessary discord.js classes
import { ActivityType, Client, Collection, GatewayIntentBits, Partials, REST, Routes } from "discord.js";
import colors from "colors";
import { readdirSync } from "fs";
import { join } from "path";

const token = process.env.TOKEN ?? "";
const clientId = process.env.CLIENT ?? "";
const guildId = process.env.GUILD ?? "";

export const masterKey = process.env.MASTER_KEY ?? "";
export const api = process.env.API ?? "";
export const auth = process.env.AUTH ?? "";
export const frontend = process.env.FRONTEND ?? "";

export const client = new Client({
    shards: "auto",
    allowedMentions: {
        parse: [],
        repliedUser: true,
    },
    intents: [GatewayIntentBits.GuildMembers, GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildVoiceStates, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.MessageContent],
    presence: {
        activities: [{ name: "Anime", type: ActivityType.Watching }],
        status: "online",
    },
    partials: [Partials.Message, Partials.Channel, Partials.Reaction, Partials.GuildMember],
});

export async function registerCommands() {
    const commands: any[] = [];

    const rest = new REST().setToken(token);
    const existingCommands: any = await rest.get(Routes.applicationGuildCommands(clientId, guildId));

    existingCommands.forEach((command: any) => {
        commands.push(command);
        console.log(colors.gray("Registered ") + colors.blue(`/${command.name}`) + colors.gray("."));
    });

    for (const file of readdirSync(join(__dirname, "./commands"))) {
        const filePath = join(join(__dirname, "./commands"), file);
        const { default: command } = await import(filePath);
        // Set a new item in the Collection with the key as the command name and the value as the exported module
        if ("data" in command && "execute" in command) {
            let canPush = true;
            for (let i = 0; i < existingCommands.length; i++) {
                if (command.data.name === existingCommands[i].name) {
                    console.log(colors.yellow(`[WARNING] The command at ${filePath} is already registered. Skipping...`));
                    canPush = false;
                    break;
                }
            }
            if (canPush) {
                commands.push(command.data.toJSON());
                console.log(colors.gray("Registered ") + colors.blue(`/${command.data.name}`) + colors.gray("."));
            }
        } else {
            console.log(colors.yellow(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`));
        }
    }

    // If there are new commands to register
    if (commands.length > 0) {
        try {
            console.log(colors.yellow(`Started refreshing ${commands.length} application (/) commands.`));

            // The post method is used to create new commands without overwriting existing ones
            const data: any = await rest.put(Routes.applicationGuildCommands(clientId, guildId), { body: commands });

            console.log(colors.green(`Successfully registered ${data.length} new application (/) commands.`));
        } catch (error) {
            console.error(error);
        }
    } else {
        console.log(colors.gray("No new commands to register."));
    }
}

export async function loadCommands() {
    (client as any).commands = new Collection();

    for (const file of readdirSync(join(__dirname, "./commands"))) {
        const filePath = join(join(__dirname, "./commands"), file);
        const { default: command } = await import(filePath);
        // Set a new item in the Collection with the key as the command name and the value as the exported module
        if ("data" in command && "execute" in command) {
            (client as any).commands.set(command.data.name, command);
            console.log(colors.gray("Registered command ") + colors.blue(`/${command.data.name}`) + colors.gray("."));
        }
    }
}

export async function loadEvents() {
    for (const file of readdirSync(join(__dirname, "./events"))) {
        const filePath = join(join(__dirname, "./events"), file);
        await import(filePath);
        console.log(colors.gray("Registered event ") + colors.blue(`${file}`) + colors.gray("."));
    }
}

export async function login() {
    await client.login(token);
}
