import { db } from "../..";
import { Anime, Manga } from "../../../types/types";

export const stats = async (): Promise<{ anime: number; manga: number; skipTimes: number; apiKeys: number } | undefined> => {
    const anime = await db.query("SELECT COUNT(*) FROM anime").get();
    const manga = await db.query("SELECT COUNT(*) FROM manga").get();
    const skipTimes = await db.query("SELECT COUNT(*) FROM skipTimes").get();
    const apiKeys = await db.query("SELECT COUNT(*) FROM apiKey").get();

    return {
        anime: Object.values(anime ?? {})[0],
        manga: Object.values(manga ?? {})[0],
        skipTimes: Object.values(skipTimes ?? {})[0],
        apiKeys: Object.values(apiKeys ?? {})[0],
    };
};
