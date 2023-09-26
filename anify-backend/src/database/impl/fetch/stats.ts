import { db } from "../..";

export const stats = async (): Promise<{ anime: number; manga: number; novels: number; skipTimes: number; apiKeys: number } | undefined> => {
    const anime = await db.query("SELECT COUNT(*) FROM anime").get();
    const manga = await db.query(`SELECT COUNT(*) FROM manga WHERE "format" IN ('MANGA', 'ONE_SHOT')`).get();
    const novels = await db.query(`SELECT COUNT(*) FROM manga WHERE "format" IN ('NOVEL')`).get();
    const skipTimes = await db.query("SELECT COUNT(*) FROM skipTimes").get();
    const apiKeys = await db.query("SELECT COUNT(*) FROM apiKey").get();

    return {
        anime: Object.values(anime ?? {})[0],
        manga: Object.values(manga ?? {})[0],
        novels: Object.values(novels ?? {})[0],
        skipTimes: Object.values(skipTimes ?? {})[0],
        apiKeys: Object.values(apiKeys ?? {})[0],
    };
};
