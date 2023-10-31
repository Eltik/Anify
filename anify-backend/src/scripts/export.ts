import dotenv from "dotenv";
dotenv.config();

import { dbType, init, postgres, sqlite } from "../database";
import colors from "colors";

const exportData = async () => {
    await init();

    if (dbType === "postgresql") {
        const anime = (await postgres.query("SELECT * FROM anime")).rows;
        const manga = (await postgres.query("SELECT * FROM manga")).rows;
        const skipTimes = (await postgres.query('SELECT * FROM "skipTimes"')).rows;
        const apiKey = (await postgres.query('SELECT * FROM "apiKey"')).rows;

        const name = process.argv.slice(2)?.toString()?.toLowerCase() && process.argv.slice(2)?.toString()?.toLowerCase().length > 0 ? process.argv.slice(2)?.toString()?.toLowerCase() : "database.json";

        const file = Bun.file(name);
        if (await file.exists()) {
            console.log(colors.yellow("WARNING: ") + colors.gray(name) + colors.yellow(" already exists!"));
        }

        await Bun.write(
            name,
            JSON.stringify(
                {
                    anime,
                    manga,
                    skipTimes,
                    apiKey,
                },
                null,
                4,
            ),
        );

        return;
    }

    const anime = await sqlite.query("SELECT * FROM anime").all();
    const manga = await sqlite.query("SELECT * FROM manga").all();
    const skipTimes = await sqlite.query("SELECT * FROM skipTimes").all();
    const apiKey = await sqlite.query("SELECT * FROM apiKey").all();

    const name = process.argv.slice(2)?.toString()?.toLowerCase() && process.argv.slice(2)?.toString()?.toLowerCase().length > 0 ? process.argv.slice(2)?.toString()?.toLowerCase() : "database.json";

    const file = Bun.file(name);
    if (await file.exists()) {
        console.log(colors.yellow("WARNING: ") + colors.gray(name) + colors.yellow(" already exists!"));
    }

    await Bun.write(
        name,
        JSON.stringify(
            {
                anime,
                manga,
                skipTimes,
                apiKey,
            },
            null,
            4,
        ),
    );
};

exportData().then(() => {
    console.log("Exported data successfully!");
});
