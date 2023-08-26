import colors from "colors";
import Database from "../database";

/**
 * Clears the database
 * @returns {Promise<void>}
 */
export const clearDatabase = async (): Promise<void> => {
    const data = await Database.clear();

    console.log(colors.red("Deleted") + colors.blue(` ${data.anime} `) + colors.red("anime"));
    console.log(colors.red("Deleted") + colors.blue(` ${data.manga} `) + colors.red("manga"));
    console.log(colors.red("Deleted") + colors.blue(` ${data.skipTimes} `) + colors.red("skip times"));
    console.log(colors.red("Deleted") + colors.blue(` ${data.apiKeys} `) + colors.red("api keys"));
};

clearDatabase().then(() => process.exit(0));
