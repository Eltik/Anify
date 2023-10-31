import { db, dbType, prisma } from "../..";
import { Format } from "../../../types/enums";

export const stats = async (): Promise<{ anime: number; manga: number; novels: number; skipTimes: number; apiKeys: number } | undefined> => {
    if (dbType == "postgresql") {
        const anime = await prisma.anime.count();
        const manga = await prisma.manga.count({
            where: {
                format: {
                    in: [Format.MANGA, Format.ONE_SHOT],
                },
            },
        });
        const novels = await prisma.manga.count({
            where: {
                format: {
                    in: [Format.NOVEL],
                },
            },
        });

        let skipTimes = 0;
        const totalSkipTimes = await prisma.skipTimes.findMany();

        for (const skipTime of totalSkipTimes) {
            const episodes = skipTime.episodes;
            for (let i = 0; i < episodes.length; i++) {
                if (episodes[i].outro?.end != 0) {
                    skipTimes++;
                }
            }
        }

        const apiKeys = await prisma.apiKey.count();

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
