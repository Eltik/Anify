import { db, dbType } from "../..";
import { Format } from "../../../types/enums";

export const stats = async (): Promise<{ anime: number; manga: number; novels: number; skipTimes: number; apiKeys: number } | undefined> => {
    if (dbType == "postgresql") {
        const animeCount = `
            SELECT COUNT(*) FROM "anime"
        `;
        const mangaCount = `
            SELECT COUNT(*) FROM "manga"
            WHERE "format" IN ('MANGA', 'ONE_SHOT')
        `;
        const novelCount = `
            SELECT COUNT(*) FROM "manga"
            WHERE "format" IN ('NOVEL')
        `;
        const skipTimesCount = `
            SELECT COUNT(*) FROM "skipTimes"
            WHERE "outro"->>'end' != '0'
        `;
        const apiKeysCount = `
            SELECT COUNT(*) FROM "apiKey"
        `;

        const anime = 0;
        const manga = 0;
        const novels = 0;
        const skipTimes = 0;
        const apiKeys = 0;

        return {
            anime,
            manga,
            novels,
            skipTimes,
            apiKeys,
        };
    }

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
