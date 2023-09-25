import Eris from "eris/esm";
import colors from "colors";
import { env } from "../env";
import { lstatSync, readdirSync } from "fs";
import { join } from "path";
import { ApplicationCommand, AutocompleteInteraction, Client, CommandInteraction, ComponentInteraction } from "eris";

export interface CustomClient extends Client {
    commands: Map<string, any>;
}

const client = Eris(env.DISCORD_TOKEN ?? "", {
    intents: [],
}) as CustomClient;
client.commands = new Map();

const subCommandNaming = (parent: string, child: string) => `${parent}-${child}`.toLowerCase();

const createSubCommand = (name: string, description: string, command: ApplicationCommand[]) => {
    return {
        type: 1,
        name,
        description,
        options: command.map((x) => ({
            ...x,
            type: 1,
        })),
    };
};

client.on("ready", async () => {
    console.log(colors.green("Bot is ready!"));

    const commands = await client.getCommands();
    if (commands.length) return;

    client.createCommand = (command: ApplicationCommand) => {
        return client.createGuildCommand(env.GUILD_ID ?? "", command);
    };

    client.bulkEditCommands = (commands: ApplicationCommand[]) => {
        return client.bulkEditGuildCommands(env.GUILD_ID ?? "", commands);
    };

    // launch all commands from commands folder
    readdirSync(join(import.meta.dir, "./commands")).forEach((file) => {
        // check if file is a folder (if it is make it a subcommand)
        if (lstatSync(join(import.meta.dir, `./commands/${file}`)).isDirectory()) {
            const subcommands: ApplicationCommand[] = [];
            readdirSync(join(import.meta.dir, `./commands/${file}`)).forEach((subfile) => {
                const command = require(`./commands/${file}/${subfile}`).default;
                if (command.setup) {
                    command.setup(client);
                    client.commands.set(command.name, command);

                    console.log(colors.gray(`Loaded command ${file}/${subfile} ${command.name}`));
                } else {
                    subcommands.push(command.schema);
                    client.commands.set(subCommandNaming(file, command.name), command);
                }
            });

            const command = createSubCommand(file, "Subcommand", subcommands);
            client.createCommand(command as any);
            return;
        }

        const command = require(`./commands/${file}`).default;
        command.setup(client);
        client.commands.set(command.name, command);
        console.log(`Loaded command ${file} ${command.name}`);
    });
});

client.on("interactionCreate", async (interaction) => {
    if (interaction instanceof ComponentInteraction) {
        if (!interaction.member?.roles.includes(env.ADMIN_ROLE_ID ?? "")) return;

        const message = await client.getMessage(interaction.message.channel.id, interaction.message.id);
        const posibleName: string[] = [];
        message.referencedMessage?.components?.forEach((x) => {
            x.components.map((y) => {
                if ("custom_id" in y) {
                    posibleName.push(y.custom_id);
                }
            });
        });

        const name = posibleName[0] || interaction?.message?.interaction?.name.split(" ").join("-").toLowerCase() || interaction.data.custom_id.split(" ").join("-").toLowerCase();

        if (client.commands.has(name)) return client.commands.get(name).onInteraction(client, interaction);
    }

    if (interaction instanceof AutocompleteInteraction) {
        if (!interaction.member?.roles.includes(env.ADMIN_ROLE_ID ?? "")) return;

        let name = interaction.data.name;
        if (interaction.data.options && interaction.data.options[0].type === 1) {
            name = subCommandNaming(name, interaction.data.options[0].name);
        }

        if (client.commands.has(name)) return client.commands.get(name).autocomplete(client, interaction);
    }

    if (interaction instanceof CommandInteraction) {
        // check if the command required admin role
        if (!interaction.member?.roles.includes(env.ADMIN_ROLE_ID ?? "")) return;

        let name = interaction.data.name;
        if (interaction.data.options && interaction.data.options[0].type === 1) {
            name = subCommandNaming(name, interaction.data.options[0].name);
        }

        if (client.commands.has(name)) return client.commands.get(name).on(client, interaction);
        switch (interaction.data.name) {
            case "ping":
                return interaction.createMessage(`Pong!`);
            default: {
                return interaction.createMessage("interaction recieved: " + interaction.data.name);
            }
        }
    }
});

client.on("error", (err: Error) => {
    console.error(err);
});

client.connect().catch(console.error);
