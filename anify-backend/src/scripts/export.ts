import { existsSync, promises as fs } from "fs";
import colors from "colors";
import Database from "../database";
import { Type } from "../mapping";

const BATCH_SIZE = 100; // Specify the desired batch size

export const exportDatabase = async () => {
    if (existsSync("database.json")) {
        console.log(colors.yellow("Warning: database.json already exists, overwriting..."));
    }

    console.log(colors.blue("Exporting database..."));

    try {
        const anime = await Database.fetchAll(Type.ANIME);
        const manga = await Database.fetchAll(Type.MANGA);
        const skipTimes = await Database.fetchAllSkipTimes();
        const keys = await Database.fetchAllAPIKeys();

        const data = {
            anime,
            manga,
            skipTimes,
            keys,
        };

        // Write in batches
        console.log(colors.blue("Writing database to file..."));
        await fs.writeFile(`database.json`, "", "utf8");
        await writeDataInBatches(data, BATCH_SIZE);

        console.log(colors.green(`Database exported successfully! Exported ${anime?.length} anime, ${manga?.length} manga, ${skipTimes?.length} skip times, and ${keys?.length} API keys.`));
    } catch (error) {
        console.error(colors.red("Error exporting database:"), error);
    }
};

const writeDataInBatches = async (data: any, batchSize: number) => {
    /*
    const keys = Object.keys(data);

    for (const key of keys) {
        const dataArray = data[key];
        const numBatches = Math.ceil(dataArray.length / batchSize);

        console.log(colors.green(`Writing ${key} to file...`));

        for (let i = 0; i < numBatches; i++) {
            const startIndex = i * batchSize;
            const endIndex = Math.min((i + 1) * batchSize, dataArray.length);
            const batchData = dataArray.slice(startIndex, endIndex);

            console.log(colors.green(`Writing ${key} batch ${i + 1} of ${numBatches}...`));

            await fs.appendFile(`database.json`, JSON.stringify({ [key]: batchData }), "utf8");

            console.log(colors.green(`Wrote ${key} batch ${i + 1} of ${numBatches}!`));
        }
    }
    */
    await fs.writeFile(`database.json`, JSON.stringify(data));
};

exportDatabase().then(() => process.exit(0));
