import config from "../colors.json";
import { CommandInteraction, EmbedBuilder, SlashCommandBuilder } from "discord.js";
import axios from "axios";
import { list } from "@/src/manager";
import { api, auth, frontend, masterKey } from "..";

let embed = new EmbedBuilder()
    .setColor(config.neutral as any)
    .setDescription("Loading...")
    .setTimestamp();

async function getStats() {
    const start = new Date(Date.now());
    const apiStats = (await axios(`${api}/stats?apikey=${masterKey}`)).data;
    const end = new Date(Date.now());
    const apiTime = end.getTime() - start.getTime();

    const start1 = new Date(Date.now());
    (await axios(`${auth}/`)).data;
    const end1 = new Date(Date.now());
    const authTime = end1.getTime() - start1.getTime();
    
    const start2 = new Date(Date.now());
    (await axios(`${frontend}/`)).data;
    const end2 = new Date(Date.now());
    const frontendTime = end2.getTime() - start2.getTime();

    const info: any = await list();

    let infoString = "";

    for (let i = 0; i < info.length; i++) {
        const proc = info[i];

        const pid = proc.pid;
        const name = proc.name;
        const upTime = new Date(proc.pm2_env.pm_uptime); // 1683653849001
        const createdAt = new Date(proc.pm2_env.created_at); // 1683653849001
        const restartTime = proc.pm2_env.restart_time; // 0
        const memory = proc.monit.memory; // 150683648
        const memoryInMb = memory / (1024 * 1024);
        const memoryFormatted = memoryInMb < 1024 ? `${memoryInMb.toFixed(2)}mb` : `${(memoryInMb / 1024).toFixed(2)}GB`;
        const cpu = proc.monit.cpu; // 0

        infoString += `
        \`\`\`${name}\`\`\`
        **PID**: \`${pid}\`
        **Uptime**: \`${formatDate(upTime)}\`
        **Started At**: \`${`${createdAt.getMonth() + 1}/${createdAt.getDate()}/${createdAt.getFullYear()} - ${createdAt.getHours()}:${createdAt.getMinutes()} ${createdAt.getHours() >= 12 ? "PM" : "AM"}`}\`
        **Restarts**: \`${restartTime}\`
        **Memory Usage**: \`${memoryFormatted}\`
        **CPU Usage**: \`${cpu}%\`
        `;
    }

    const anime = apiStats.anime;
    const manga = apiStats.manga;
    const novels = apiStats.novels;

    embed = new EmbedBuilder()
        .setColor(config.neutral as any)
        .setTitle("Anify - Stats")
        .setDescription(
            `
        \`\`\`Media Count\`\`\`
        **Anime**: \`${anime}\`
        **Manga**: \`${manga}\`
        **Novels**: \`${novels}\`
        
        \`\`\`Processes\`\`\`
        **API Response**: \`${apiTime}ms\`
        **Frontend Response**: \`${frontendTime}ms\`
        **Auth Response**: \`${authTime}ms\`
        ${infoString}
        `
        )
        .setTimestamp();
}

function formatDate(date: Date) {
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);

    let interval = Math.floor(seconds / 31536000);

    if (interval >= 1) {
        return interval + " years ago";
    }

    interval = Math.floor(seconds / 2592000);
    if (interval >= 1) {
        return interval + " months ago";
    }

    interval = Math.floor(seconds / 86400);
    if (interval >= 1) {
        return interval + " days ago";
    }

    interval = Math.floor(seconds / 3600);
    if (interval >= 1) {
        return interval + " hours ago";
    }

    interval = Math.floor(seconds / 60);
    if (interval >= 1) {
        return interval + " minutes ago";
    }

    return Math.floor(seconds) + " seconds ago";
}

export default {
    data: new SlashCommandBuilder().setName("stats").setDescription("Get stats about the website."),
    async execute(interaction: CommandInteraction) {
        await interaction.reply({ embeds: [embed] });
        await getStats();
        await interaction.editReply({ embeds: [embed] });
    },
};
