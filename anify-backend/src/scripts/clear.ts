import { db, dbType } from "../database";
import colors from "colors";

const clearData = async () => {
    if (dbType == "postgresql") {
        const animeCount = `
            SELECT COUNT(*) FROM "anime"
        `;
        const mangaCount = `
            SELECT COUNT(*) FROM "manga"
            WHERE "format" IN ('MANGA', 'ONE_SHOT')
        `;
        const novelCount = `
            SELECT COUNT(*) FROM "manga"
            WHERE "format" IN ('NOVEL')
        `;
        const skipTimesCount = `
            SELECT COUNT(*) FROM "skipTimes"
            WHERE "outro"->>'end' != '0'
        `;
        const apiKeysCount = `
            SELECT COUNT(*) FROM "apiKey"
        `;

        const anime = 0;
        const manga = 0;
        const novels = 0;
        const skipTimes = 0;
        const apiKey = 0;

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
