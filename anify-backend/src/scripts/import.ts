import dotenv from "dotenv";
dotenv.config();

import { get } from "../database/impl/fetch/get";
import { createKey } from "../database/impl/keys/createKey";
import { getKey } from "../database/impl/keys/key";
import { create } from "../database/impl/modify/create";
import { createSkipTimes } from "../database/impl/skipTimes/createSkipTimes";
import { getSkipTimes } from "../database/impl/skipTimes/getSkipTimes";
import { isString } from "../helper";
import { Season } from "../types/enums";

export const importData = async () => {
    const name = process.argv.slice(2)?.toString()?.toLowerCase() && process.argv.slice(2)?.toString()?.toLowerCase().length > 0 ? process.argv.slice(2)?.toString()?.toLowerCase() : "database.json";

    const file = Bun.file(name);
    if (!(await file.exists())) throw new Error("File does not exist! You can run bun run import <file> to import data from a specific file path.");

    const data = await file.json();

    const count = {
        anime: 0,
        manga: 0,
        skipTimes: 0,
        keys: 0,
    };

    for (const media of data.anime) {
        if (await get(media.id)) continue;
        if (media.season) media.season = media.season.replace(/"/g, "");
        if (isString(media.averagePopularity)) {
            try {
                media.averagePopularity = JSON.parse(media.averagePopularity);
            } catch (e) {
                //
            }
        }
        if (media.season === "AUTUMN") {
            media.season = Season.FALL;
        }
        if (media.season === "????" || media.season != Season.FALL && media.season != Season.SPRING && media.season != Season.SUMMER && media.season != Season.WINTER) {
            media.season = Season.UNKNOWN;
        }

        try {
            await create(media, false);

            count.anime++;
        } catch (error) {
            console.error(`Failed to import anime ${media.slug}!`);
            console.error(error);
        }
    }

    for (const media of data.manga) {
        if (await get(media.id)) continue;

        if (isString(media.averagePopularity)) {
            try {
                media.averagePopularity = JSON.parse(media.averagePopularity);
            } catch (e) {
                //
            }
        }

        try {
            await create(media, false);

            count.manga++;
        } catch (error) {
            console.error(`Failed to import manga ${media.slug}!`);
            console.error(error);
        }
    }

    for (const skipTime of data.skipTimes) {
        if (await getSkipTimes(skipTime.id)) continue;

        try {
            await createSkipTimes(skipTime, false);

            count.skipTimes++;
        } catch (error) {
            console.error(`Failed to import skip time ${skipTime.id}!`);
            console.error(error);
        }
    }

    for (const key of data.apiKey) {
        if (await getKey(key.id)) continue;

        try {
            await createKey(key);

            count.keys++;
        } catch (error) {
            console.error(`Failed to import skip time ${key.id}!`);
            console.error(error);
        }
    }

    console.log(`Imported ${count.anime} anime, ${count.manga} manga, ${count.skipTimes} skip times, and ${count.keys} API keys!`);
};

importData().then(() => {
    console.log("Imported data successfully!");
});
