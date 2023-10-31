import { db, dbType, prisma } from "../database";
import colors from "colors";

const clearData = async () => {
    if (dbType == "postgresql") {
        const anime = await prisma.anime.count();
        const manga = await prisma.manga.count();
        const skipTimes = await prisma.skipTimes.count();
        const apiKey = await prisma.apiKey.count();

        await prisma.anime.deleteMany();
        await prisma.manga.deleteMany();
        await prisma.skipTimes.deleteMany();
        await prisma.apiKey.deleteMany();

        console.log(colors.green(`Cleared ${anime} anime, ${manga} manga, ${skipTimes} skip times, and ${apiKey} API keys!`) + "\n");

        return;
    }

    const anime = await db.query("SELECT * FROM anime").all();
    const manga = await db.query("SELECT * FROM manga").all();
    const skipTimes = await db.query("SELECT * FROM skipTimes").all();
    const apiKey = await db.query("SELECT * FROM apiKey").all();

    await db.query("DELETE FROM anime").run();
    await db.query("DELETE FROM manga").run();
    await db.query("DELETE FROM skipTimes").run();
    await db.query("DELETE FROM apiKey").run();

    console.log(colors.green(`Cleared ${anime.length} anime, ${manga.length} manga, ${skipTimes.length} skip times, and ${apiKey.length} API keys!`) + "\n");
};

clearData().then(() => {
    console.log(colors.green("Done!"));
});
