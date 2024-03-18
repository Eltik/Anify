import { Database } from "bun:sqlite";
import { Client } from "pg";
import { env } from "../env";

export const dbType: "sqlite" | "postgresql" = env.DATABASE_URL.startsWith("postgres") ? "postgresql" : "sqlite";
export const sqlite = new Database("db.sqlite");
export const postgres = new Client(env.DATABASE_URL);

export const init = async () => {
    if (dbType === "postgresql") {
        const anime = `
        CREATE TABLE IF NOT EXISTS anime (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
            slug TEXT,
            "coverImage" TEXT,
            "bannerImage" TEXT,
            trailer TEXT,
            status VARCHAR(255),
            season VARCHAR(255) DEFAULT 'UNKNOWN',
            title JSONB,
            "currentEpisode" REAL,
            mappings JSONB DEFAULT '{}'::JSONB,
            synonyms TEXT[],
            "countryOfOrigin" TEXT,
            description TEXT,
            duration REAL,
            color TEXT,
            year INT,
            rating JSONB,
            popularity JSONB,
            type TEXT,
            format VARCHAR(255) DEFAULT 'UNKNOWN',
            relations JSONB[] DEFAULT '{}'::JSONB[],
            "totalEpisodes" REAL,
            genres TEXT[],
            tags TEXT[],
            episodes JSONB DEFAULT '{"latest": {"updatedAt": 0, "latestEpisode": 0, "latestTitle": ""}, "data": []}'::JSONB,
            "averageRating" REAL,
            "averagePopularity" REAL,
            artwork JSONB[] DEFAULT ARRAY[]::JSONB[],
            characters JSONB[] DEFAULT ARRAY[]::JSONB[]
        );
        `;
        const manga = `
        CREATE TABLE IF NOT EXISTS manga (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
            slug TEXT,
            "coverImage" TEXT,
            "bannerImage" TEXT,
            status VARCHAR(255),
            title JSONB,
            mappings JSONB DEFAULT '{}'::JSONB,
            synonyms TEXT[],
            "countryOfOrigin" TEXT,
            description TEXT,
            color TEXT,
            year INT,
            rating JSONB,
            popularity JSONB,
            type TEXT,
            format VARCHAR(255) DEFAULT 'UNKNOWN',
            relations JSONB[] DEFAULT '{}'::JSONB[],
            "currentChapter" REAL,
            "totalChapters" REAL,
            "totalVolumes" REAL,
            genres TEXT[],
            tags TEXT[],
            chapters JSONB DEFAULT '{"latest": {"updatedAt": 0, "latestChapter": 0, "latestTitle": ""}, "data": []}'::JSONB,
            "averageRating" REAL,
            "averagePopularity" REAL,
            artwork JSONB[] DEFAULT ARRAY[]::JSONB[],
            characters JSONB[] DEFAULT ARRAY[]::JSONB[]
        );
        `;
        const skipTimes = `
        CREATE TABLE IF NOT EXISTS "skipTimes" (
            id TEXT PRIMARY KEY,
            episodes JSONB[]
        );
        `;
        const apiKey = `
        CREATE TABLE IF NOT EXISTS "apiKey" (
            id TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
            key TEXT UNIQUE,
            "requestCount" INT DEFAULT 0,
            "createdAt" TIMESTAMPTZ DEFAULT NOW(),
            "updatedAt" TIMESTAMPTZ
        );
        `;

        const extensionQuery = `CREATE EXTENSION IF NOT EXISTS pg_trgm;`;
        const functionQuery = `
            create or replace function most_similar(text, text[]) returns double precision
            language sql as $$
                select max(similarity($1,x)) from unnest($2) f(x)
            $$;
        `;

        await postgres.connect();
        await postgres.query(extensionQuery);
        await postgres.query(functionQuery);
        await postgres.query(anime);
        await postgres.query(manga);
        await postgres.query(skipTimes);
        await postgres.query(apiKey);
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
        currentEpisode REAL,
        mappings JSON DEFAULT '[]',
        synonyms JSON DEFAULT '[]',
        countryOfOrigin TEXT,
        description TEXT,
        duration REAL,
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
        color TEXT,
        year INTEGER,
        rating JSON,
        popularity JSON,
        type TEXT,
        format TEXT DEFAULT 'UNKNOWN',
        relations JSON DEFAULT '[]',
        currentChapter REAL,
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

    sqlite.query(anime).run();
    sqlite.query(manga).run();
    sqlite.query(skipTimes).run();
    sqlite.query(apiKey).run();
};
