import { existsSync, promises as fs } from "fs";
import colors from "colors";
import Database from "../database";
import { Anime, Manga, Type } from "../mapping";

/**
 * Imports the database from a JSON file.
 * @returns {Promise<void>}
 */
export const importDatabase = async (): Promise<void> => {
    if (!existsSync("database.json")) {
        console.error(colors.red("Error importing database: database.json does not exist"));
        throw new Error("Database import failed");
    }

    console.log(colors.blue("Importing database..."));

    let createdAnime = 0;
    let updatedAnime = 0;
    let createdManga = 0;
    let updatedManga = 0;

    try {
        const data = JSON.parse(await fs.readFile("database.json", "utf8"));

        let { anime, manga, skipTimes, keys } = data;

        if (!anime) anime = [];
        if (!manga) manga = [];
        if (!skipTimes) skipTimes = [];
        if (!keys) keys = [];

        for (let i = 0; i < anime.length; i++) {
            const possible = await Database.info(anime[i].id);
            if (possible) {
                const media: Anime = anime[i];

                let update = false;
                for (const mapping of media.mappings) {
                    const curMapping = possible.mappings.find((m) => m.providerId === mapping.providerId);
                    if (!curMapping || curMapping.id != mapping.id || curMapping.similarity != mapping.similarity) {
                        update = true;
                        break;
                    }
                }

                if (!update) {
                    if (media.bannerImage != possible.bannerImage || media.coverImage != possible.coverImage) update = true;
                }

                if (update) {
                    await Database.update(possible.id, possible.type, media);
                    console.log(colors.green("Updated anime entry for ") + colors.blue(anime[i].title.english ?? anime[i].title.romaji ?? anime[i].title.native) + colors.green("."));

                    updatedAnime++;
                    continue;
                } else {
                    continue;
                }
            }

            await Database.createEntry(anime[i]);
            console.log(colors.green("Created anime entry for ") + colors.blue(anime[i].title.english ?? anime[i].title.romaji ?? anime[i].title.native) + colors.green("."));
            createdAnime++;
        }

        for (let i = 0; i < manga.length; i++) {
            const possible = await Database.info(manga[i].id);
            if (possible) {
                const media: Manga = manga[i];

                let update = false;
                for (const mapping of media.mappings) {
                    const curMapping = possible.mappings.find((m) => m.providerId === mapping.providerId);
                    if (!curMapping || curMapping.id != mapping.id || curMapping.similarity != mapping.similarity) {
                        update = true;
                        break;
                    }
                }

                if (!update) {
                    if (media.bannerImage != possible.bannerImage || media.coverImage != possible.coverImage) update = true;
                }

                if (update) {
                    await Database.update(possible.id, possible.type, media);
                    console.log(colors.green("Updated manga entry for ") + colors.blue(manga[i].title.english ?? manga[i].title.romaji ?? manga[i].title.native) + colors.green("."));

                    updatedManga++;
                    continue;
                } else {
                    continue;
                }
            }

            await Database.createEntry(manga[i]);
            console.log(colors.green("Created manga entry for ") + colors.blue(manga[i].title.english ?? manga[i].title.romaji ?? manga[i].title.native) + colors.green("."));

            createdManga++;
        }

        for (const skipTime of skipTimes) {
            await Database.updateSkipTimes(skipTime.id, skipTime.episodes);
            console.log(colors.green("Created skip time ") + colors.blue(JSON.stringify(skipTime.id)) + colors.green("."));
        }

        for (const key of keys) {
            await Database.insertAPIKey(key);
            console.log(colors.green("Created API key ") + colors.blue(key.key) + colors.green("."));
        }

        console.log(colors.green(`Imported ${createdAnime} anime entries, ${updatedAnime} updated.`));
        console.log(colors.green(`Imported ${createdManga} manga entries, ${updatedManga} updated.`));
        return;
    } catch (error) {
        console.error(colors.red(`Error importing database: ${error}`));
        throw new Error("Database import failed");
    }
};

importDatabase().then(() => process.exit(0));
