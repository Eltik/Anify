import dotenv from "dotenv";
dotenv.config();

import colors from "colors";
import { sqlite, dbType, postgres, init } from "../database";

const clearData = async () => {
    await init();

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
            SELECT * FROM "skipTimes"
        `;
        const apiKeysCount = `
            SELECT COUNT(*) FROM "apiKey"
        `;

        const anime = await postgres.query<{ count: number }>(animeCount).then((res) => res.rows[0]);
        const manga = await postgres.query<{ count: number }>(mangaCount).then((res) => res.rows[0]);
        const novels = await postgres.query<{ count: number }>(novelCount).then((res) => res.rows[0]);
        let skipTimes = 0;
        (await postgres.query(skipTimesCount).then((res) => res.rows))?.map((row) => {
            const episodes = row.episodes;
            for (let i = 0; i < episodes.length; i++) {
                if (episodes[i].outro?.end != 0) {
                    skipTimes++;
                }
            }
        });
        const apiKeys = await postgres.query<{ count: number }>(apiKeysCount).then((res) => res.rows[0]);

        await postgres.query(`
            DELETE FROM "anime"
        `);
        await postgres.query(`
            DELETE FROM "manga"
        `);
        await postgres.query(`
            DELETE FROM "skipTimes"
        `);
        await postgres.query(`
            DELETE FROM "apiKey"
        `);

        console.log(colors.green(`Cleared ${anime.count} anime, ${manga.count} manga, ${novels.count} novels, ${skipTimes} skip times, and ${apiKeys.count} API keys!`) + "\n");

        return;
    }

    const anime = await sqlite.query("SELECT * FROM anime").all();
    const manga = await sqlite.query("SELECT * FROM manga").all();
    const skipTimes = await sqlite.query("SELECT * FROM skipTimes").all();
    const apiKey = await sqlite.query("SELECT * FROM apiKey").all();

    await sqlite.query("DELETE FROM anime").run();
    await sqlite.query("DELETE FROM manga").run();
    await sqlite.query("DELETE FROM skipTimes").run();
    await sqlite.query("DELETE FROM apiKey").run();

    console.log(colors.green(`Cleared ${anime.length} anime, ${manga.length} manga, ${skipTimes.length} skip times, and ${apiKey.length} API keys!`));
};

clearData().then(() => {
    console.log(colors.green("Done!"));
    process.exit(0);
});
