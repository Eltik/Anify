import dotenv from "dotenv";
dotenv.config();

import colors from "colors";
import { get } from "../database/impl/fetch/get";
import { createKey } from "../database/impl/keys/createKey";
import { getKey } from "../database/impl/keys/key";
import { create } from "../database/impl/modify/create";
import { createSkipTimes } from "../database/impl/skipTimes/createSkipTimes";
import { getSkipTimes } from "../database/impl/skipTimes/getSkipTimes";
import { isString } from "../helper";
import { Season } from "../types/enums";
import { init } from "../database";

export const importData = async () => {
    await init();
    const name = process.argv.slice(2)?.toString()?.toLowerCase() && process.argv.slice(2)?.toString()?.toLowerCase().length > 0 ? process.argv.slice(2)?.toString()?.toLowerCase() : "database.json";

    console.log(colors.gray(`Importing data from ${name}...`));

    const file = Bun.file(name);
    if (!(await file.exists())) throw new Error("File does not exist! You can run bun run import <file> to import data from a specific file path.");

    const data = await file.json();
    console.log(colors.green("Successfully parsed data! Importing..."));

    const count = {
        anime: 0,
        manga: 0,
        skipTimes: 0,
        keys: 0,
    };

    const failedCount = {
        anime: 0,
        manga: 0,
        skipTimes: 0,
        keys: 0,
    };

    console.log(colors.gray("Importing anime data..."));
    for (const media of data.anime) {
        if (await get(media.id)) continue;
        if (media.season) media.season = media.season.replace(/"/g, "");
        if (isString(media.averagePopularity)) {
            try {
                media.averagePopularity = JSON.parse(media.averagePopularity);
            } catch (e) {
                failedCount.anime++;
            }
        }
        if (media.season === "AUTUMN") {
            media.season = Season.FALL;
        }
        if (media.season === "????" || (media.season != Season.FALL && media.season != Season.SPRING && media.season != Season.SUMMER && media.season != Season.WINTER)) {
            media.season = Season.UNKNOWN;
        }

        try {
            await create(media, false);

            console.log(`Imported anime ${media.slug}!`);

            count.anime++;
        } catch (error) {
            console.error(`Failed to import anime ${media.slug}!`);
            console.error(error);
        }
    }

    console.log(colors.gray("Importing manga data..."));
    for (const media of data.manga) {
        if (await get(media.id)) continue;

        if (isString(media.averagePopularity)) {
            try {
                media.averagePopularity = JSON.parse(media.averagePopularity);
            } catch (e) {
                failedCount.manga++;
            }
        }

        try {
            await create(media, false);

            console.log(`Imported manga ${media.slug}!`);

            count.manga++;
        } catch (error) {
            console.error(`Failed to import manga ${media.slug}!`);
            console.error(error);
        }
    }

    console.log(colors.gray("Importing skip time data..."));
    for (const skipTime of data.skipTimes) {
        if (await getSkipTimes(skipTime.id)) continue;

        try {
            const stringify = isString(skipTime.episodes);
            await createSkipTimes(skipTime, !stringify);

            console.log(`Imported skip time ${skipTime.id}!`);

            count.skipTimes++;
        } catch (error) {
            console.error(`Failed to import skip time ${skipTime.id}!`);
            console.error(error);
            failedCount.skipTimes++;
        }
    }

    console.log(colors.gray("Importing API key data..."));
    for (const key of data.apiKey) {
        if (await getKey(key.id)) continue;

        try {
            await createKey(key);

            console.log(`Imported API key ${key.id}!`);

            count.keys++;
        } catch (error) {
            console.error(`Failed to import api key ${key.id}!`);
            console.error(error);
            failedCount.keys++;
        }
    }

    console.log(
        colors.green(`Successfully imported ${count.anime} anime, ${count.manga} manga, ${count.skipTimes} skip times, and ${count.keys} API keys!`) +
            colors.red(` Failed to import ${failedCount.anime} anime, ${failedCount.manga} manga, ${failedCount.skipTimes} skip times, and ${failedCount.keys} API keys!`),
    );
};

importData().then(() => {
    console.log("Imported data successfully!");
    process.exit(0);
});
