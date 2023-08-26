import { CommandInteraction, SlashCommandBuilder } from "discord.js";
declare const _default: {
    data: Omit<SlashCommandBuilder, "addSubcommand" | "addSubcommandGroup">;
    execute(interaction: CommandInteraction): Promise<import("discord.js").InteractionResponse<boolean> | undefined>;
};
export default _default;
