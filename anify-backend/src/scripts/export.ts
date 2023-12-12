import dotenv from "dotenv";
dotenv.config();

import { dbType, init, postgres, sqlite } from "../database";
import colors from "colors";

const exportData = async () => {
    await init();

    if (dbType === "postgresql") {
        const batchSize = 100;
        const name = process.argv.slice(2)?.toString()?.toLowerCase() && process.argv.slice(2)?.toString()?.toLowerCase().length > 0 ? process.argv.slice(2)?.toString()?.toLowerCase() : "database.json";

        const file = Bun.file(name);
        if (await file.exists()) {
            console.log(colors.yellow("WARNING: ") + colors.gray(name) + colors.yellow(" already exists!"));
        }

        const exportData = async (tableName: string) => {
            let offset = 0;
            let allRows: any[] = [];

            console.log(colors.yellow(`Exporting ${tableName}...`) + colors.gray(` (batch size: ${batchSize})`));

            while (true) {
                const query = `SELECT * FROM ${tableName} LIMIT ${batchSize} OFFSET ${offset}`;
                const rows = (await postgres.query(query)).rows;

                if (rows.length === 0) {
                    break;
                }

                allRows = allRows.concat(rows);
                offset += batchSize;
            }

            console.log(colors.green(`Exported ${tableName} successfully!`) + colors.gray(` (${allRows.length} rows)`));
            return allRows;
        };

        const anime = await exportData("anime");
        const manga = await exportData("manga");
        const skipTimes = await exportData('"skipTimes"');
        const apiKey = await exportData('"apiKey"');

        const writer = file.writer();

        // Write anime
        writer.write("{");
        writer.write('"anime": [');

        console.log("Writing anime...");

        for (let i = 0; i < anime.length; i++) {
            writer.write(JSON.stringify(anime[i], null, 4));
            if (i !== anime.length - 1) {
                writer.write(",");
            }
        }

        console.log("Wrote anime!");

        writer.write("],");
        writer.write('"manga": [');

        console.log("Writing manga...");

        for (let i = 0; i < manga.length; i++) {
            writer.write(JSON.stringify(manga[i], null, 4));
            if (i !== manga.length - 1) {
                writer.write(",");
            }
        }

        console.log("Wrote manga!");

        writer.write("],");
        writer.write('"skipTimes": [');

        console.log("Writing skipTimes...");

        for (let i = 0; i < skipTimes.length; i++) {
            writer.write(JSON.stringify(skipTimes[i], null, 4));
            if (i !== skipTimes.length - 1) {
                writer.write(",");
            }
        }

        console.log("Wrote skipTimes!");

        writer.write("],");
        writer.write('"apiKey": [');

        console.log("Writing apiKey...");

        for (let i = 0; i < apiKey.length; i++) {
            writer.write(JSON.stringify(apiKey[i], null, 4));
            if (i !== apiKey.length - 1) {
                writer.write(",");
            }
        }

        console.log("Wrote apiKey!");

        writer.write("]}");
        writer.end();

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
