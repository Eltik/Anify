import colors from "colors";
import { unlink } from "fs/promises";
import { join } from "path";

/**
 * Clears the database
 * @returns {Promise<void>}
 */
export const clearDatabase = async (): Promise<void> => {
    await unlink(join(__dirname, "../../prisma/db.sqlite"));

    console.log(colors.red("Deleted database"));
};

clearDatabase().then(() => process.exit(0));
