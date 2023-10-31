import { Database } from "bun:sqlite";
import { env } from "../env";
import { PrismaClient } from "@prisma/client";
import { ChapterData, EpisodeData } from "../types/types";
import { Format, Type } from "../types/enums";
import { averageMetric } from "../helper";

export const dbType: "sqlite" | "postgresql" = env.DATABASE_URL.startsWith("postgres") ? "postgresql" : "sqlite";
export const db = new Database("db.sqlite");
export let prisma = new PrismaClient();

export const init = async () => {
    if (dbType === "postgresql") {
        const $prisma = new PrismaClient({
            log: ["error"],
        });

        const dedupeFields = ["synonyms", "genres"];

        $prisma.$use(async (params, next) => {
            if (params.model === "Manga" || params.model === "Anime") {
                if (!params?.args) return next(params);
        
                for (const field of dedupeFields) {
                    if (params.args["data"] && params.args["data"][field]) {
                        params.args["data"][field] = Array.from(new Set(params.args["data"][field]));
                    }
                }
            }
        
            return next(params);
        });

        const modifiedPrisma = $prisma.$extends({
            query: {
                anime: {
                    async $allOperations({ model, operation, args, query }) {
                        const result: any = await query(args);
        
                        if (result?.synonyms) result.synonyms = Array.from(new Set(result.synonyms));
                        if (result?.genres) result.genres = Array.from(new Set(result.genres));
        
                        return result;
                    },
                },
                manga: {
                    async $allOperations({ model, operation, args, query }) {
                        const result: any = await query(args);
        
                        if (result?.synonyms) result.synonyms = Array.from(new Set(result.synonyms));
                        if (result?.genres) result.genres = Array.from(new Set(result.genres));
        
                        return result;
                    },
                },
            },
            result: {
                anime: {
                    save: {
                        needs: { id: true },
                        compute(anime: any) {
                            delete anime["averagePopularity"];
                            delete anime["averageRating"];
        
                            return () => $prisma.anime.update({ where: { id: anime.id }, data: anime });
                        },
                    },
                    averageRating: {
                        needs: { rating: true },
                        compute(anime) {
                            return averageMetric(anime.rating);
                        },
                    },
                    averagePopularity: {
                        needs: { popularity: true },
                        compute(anime) {
                            return averageMetric(anime.popularity);
                        },
                    },
                },
                manga: {
                    save: {
                        needs: { id: true },
                        compute(manga: any) {
                            delete manga["averagePopularity"];
                            delete manga["averageRating"];
        
                            return () => $prisma.manga.update({ where: { id: manga.id }, data: manga });
                        },
                    },
                    averageRating: {
                        needs: { rating: true },
                        compute(manga) {
                            return averageMetric(manga.rating);
                        },
                    },
                    averagePopularity: {
                        needs: { popularity: true },
                        compute(manga) {
                            return averageMetric(manga.popularity);
                        },
                    },
                },
            },
        });
        
        const globalForPrisma = global as unknown as { prisma: typeof modifiedPrisma };
        prisma = globalForPrisma.prisma as unknown as PrismaClient || modifiedPrisma;

        if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = modifiedPrisma;

        await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pg_trgm;`;
        await prisma.$executeRaw`create or replace function most_similar(text, text[]) returns double precision
        language sql as $$
            select max(similarity($1,x)) from unnest($2) f(x)
        $$;`;

        return;
    }

    const anime = `
    CREATE TABLE IF NOT EXISTS anime (
        id TEXT PRIMARY KEY,
        slug TEXT,
        coverImage TEXT,
        bannerImage TEXT,
        trailer TEXT,
        status TEXT,
        season TEXT DEFAULT 'UNKNOWN',
        title JSON,
        currentEpisode INTEGER,
        mappings JSON DEFAULT '[]',
        synonyms JSON DEFAULT '[]',
        countryOfOrigin TEXT,
        description TEXT,
        duration INTEGER,
        color TEXT,
        year INTEGER,
        rating JSON,
        popularity JSON,
        type TEXT,
        format TEXT DEFAULT 'UNKNOWN',
        relations JSON DEFAULT '[]',
        totalEpisodes REAL,
        genres JSON DEFAULT '[]',
        tags JSON DEFAULT '[]',
        episodes JSON DEFAULT '{"latest": {"updatedAt": 0, "latestEpisode": 0, "latestTitle": ""}, "data": []}',
        averageRating REAL,
        averagePopularity REAL,
        artwork JSON DEFAULT '[]',
        characters JSON DEFAULT '[]'
    );
    `;

    const manga = `
    CREATE TABLE IF NOT EXISTS manga (
        id TEXT PRIMARY KEY,
        slug TEXT,
        coverImage TEXT,
        bannerImage TEXT,
        status TEXT,
        title JSON,
        mappings JSON DEFAULT '[]',
        synonyms JSON DEFAULT '[]',
        countryOfOrigin TEXT,
        description TEXT,
        duration INTEGER,
        color TEXT,
        year INTEGER,
        rating JSON,
        popularity JSON,
        type TEXT,
        format TEXT DEFAULT 'UNKNOWN',
        relations JSON DEFAULT '[]',
        currentChapter INTEGER,
        totalChapters REAL,
        totalVolumes REAL,
        genres JSON DEFAULT '[]',
        tags JSON DEFAULT '[]',
        chapters JSON DEFAULT '{"latest": {"updatedAt": 0, "latestChapter": 0, "latestTitle": ""}, "data": []}',
        averageRating REAL,
        averagePopularity REAL,
        artwork JSON DEFAULT '[]',
        characters JSON DEFAULT '[]'
    );
    `;

    const skipTimes = `
    CREATE TABLE IF NOT EXISTS skipTimes (
        id TEXT PRIMARY KEY,
        episodes JSON DEFAULT '{}'
    );
    `;

    const apiKey = `
    CREATE TABLE IF NOT EXISTS apiKey (
        id TEXT PRIMARY KEY,
        key TEXT,
        requestCount INTEGER DEFAULT 0,
        createdAt INTEGER DEFAULT 0,
        updatedAt INTEGER DEFAULT 0
    );
    `;

    db.query(anime).run();
    db.query(manga).run();
    db.query(skipTimes).run();
    db.query(apiKey).run();
};

declare global {
    namespace PrismaJson {
        type Title = {
            english: string | null;
            romaji: string | null;
            native: string | null;
        };

        type Rating = MetaSitesMetric;
        type Popularity = MetaSitesMetric;

        type MetaSitesMetric = { [key: string]: number } | null;

        type SkipTimes = {
            duration?: string;
            number: number;
            intro: {
                start: number;
                end: number;
            };
            outro: {
                start: number;
                end: number;
            };
        };

        type Episodes = {
            latest: {
                updatedAt: number;
                latestEpisode: number;
                latestTitle: string;
            };
            data: EpisodeData[];
        };

        type Chapters = {
            latest: {
                updatedAt: number;
                latestChapter: number;
                latestTitle: string;
            };
            data: ChapterData[];
        };

        type Artwork = {
            type: "banner" | "poster" | "clear_logo" | "top_banner" | "icon" | "clear_art";
            img: string;
            providerId: string;
        };

        type Relations = {
            id: string;
            type: Type;
            title: Title;
            format: Format;
            relationType: string;
        };

        type Characters = {
            name: string;
            image: string;
            voiceActor: {
                name: string;
                image: string;
            };
        };

        type SplitEntryMapping = `${number}@${number}-${number}`;
    }
}
