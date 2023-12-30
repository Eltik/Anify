import * as response from "../../responses/anify";
import { AutocompleteInteraction, Client, CommandInteraction, Constants, TextableChannel } from "eris";
import view from "../../../utils/fs/view";
import logs from "../../../utils/pm2/logs";
import { list } from "../../../utils/pm2";

export default {
    name: "logs",
    schema: {
        name: "logs",
        description: "Fetch logs of a running processes of PM2.",
        type: Constants.ApplicationCommandTypes.CHAT_INPUT,
        options: [
            {
                name: "process",
                description: "Select a process to fetch logs for.",
                type: Constants.ApplicationCommandOptionTypes.STRING,
                autocomplete: true,
                required: true,
            },
        ],
    },
    autocomplete: async (client: Client, interaction: AutocompleteInteraction) => {
        // get the current text the user has sent
        const firstOptions = interaction.data.options[0];
        let secondOptions: any = {};
        let text: string;

        if ("options" in firstOptions) {
            secondOptions = firstOptions?.options?.at(0);
        }
        if ("value" in secondOptions) {
            text = secondOptions?.value as string;
        }

        const processes = await list();
        interaction.result([
            ...processes.data.map((x) => ({
                name: x.name ?? "unknown",
                value: x.name ?? "unknown",
            })),
        ]);
    },
    on: async (client: Client, interaction: CommandInteraction<TextableChannel>) => {
        let name: string | undefined = (interaction?.data?.options?.[0] as any)?.options?.[0]?.value as string;
        const list = view();

        if (name == "latest") name = list[0].name;

        const data = await logs(name);
        if (data[0].error) return interaction.createMessage(response.config.error.message(data[0].error));

        interaction.createMessage(
            response.config.message({
                title: "Logs for " + name,
                data: data[0].data ?? "",
            }),
        );
    },
};
