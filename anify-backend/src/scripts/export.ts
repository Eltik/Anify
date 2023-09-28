import { db } from "../database";
import colors from "colors";

const exportData = async () => {
    const anime = await db.query("SELECT * FROM anime").all();
    const manga = await db.query("SELECT * FROM manga").all();
    const skipTimes = await db.query("SELECT * FROM skipTimes").all();
    const apiKey = await db.query("SELECT * FROM apiKey").all();

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
