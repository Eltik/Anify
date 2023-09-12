import * as response from "../../responses/anify";
import view from "../../../utils/fs/view";
import { Client, CommandInteraction, Constants, TextableChannel } from "eris";

export default {
    name: "list",
    schema: {
        name: "list",
        description: "View all the folders in the build folder. (This is where the repos are stored.)",
        type: Constants.ApplicationCommandTypes.CHAT_INPUT,
    },
    on: async (client: Client, interaction: CommandInteraction<TextableChannel>) => {
        const folders = view();
        if (!folders.length || !folders) return interaction.createMessage(response.listRepo.error.message("Cant find any folders in build folder!"));

        interaction.createMessage(response.listRepo.message(folders));
    },
};
