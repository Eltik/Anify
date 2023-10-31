import { sqlite, dbType, postgres } from "../..";
import { SkipTime } from "../../../types/types";

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
            SELECT * FROM "skipTimes"
        `;
        const apiKeysCount = `
            SELECT COUNT(*) FROM "apiKey"
        `;

        const anime = await postgres.query<{ count: number }>(animeCount).then((res) => res.rows[0]);
        const manga = await postgres.query<{ count: number }>(mangaCount).then((res) => res.rows[0]);
        const novels = await postgres.query<{ count: number }>(novelCount).then((res) => res.rows[0]);
        let skipTimes = 0;
        (await postgres.query(skipTimesCount).then((res) => res.rows))?.map((row: SkipTime) => {
            const episodes = row.episodes;
            for (let i = 0; i < episodes.length; i++) {
                if (episodes[i].outro?.end != 0) {
                    skipTimes++;
                }
            }
        });
        const apiKeys = await postgres.query<{ count: number }>(apiKeysCount).then((res) => res.rows[0]);

        return {
            anime: Number(anime?.count ?? 0),
            manga: Number(manga?.count ?? 0),
            novels: Number(novels?.count ?? 0),
            skipTimes,
            apiKeys: Number(apiKeys?.count ?? 0),
        };
    }

    const anime = await sqlite.query("SELECT COUNT(*) FROM anime").get();
    const manga = await sqlite.query(`SELECT COUNT(*) FROM manga WHERE "format" IN ('MANGA', 'ONE_SHOT')`).get();
    const novels = await sqlite.query(`SELECT COUNT(*) FROM manga WHERE "format" IN ('NOVEL')`).get();
    const skipTimes = await sqlite.query("SELECT COUNT(*) FROM skipTimes").get();
    const apiKeys = await sqlite.query("SELECT COUNT(*) FROM apiKey").get();

    return {
        anime: Object.values(anime ?? {})[0],
        manga: Object.values(manga ?? {})[0],
        novels: Object.values(novels ?? {})[0],
        skipTimes: Object.values(skipTimes ?? {})[0],
        apiKeys: Object.values(apiKeys ?? {})[0],
    };
};
