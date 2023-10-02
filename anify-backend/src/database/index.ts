import { Database } from "bun:sqlite";

export const db = new Database("db.sqlite");

export const init = async () => {
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

    const animeFts3 = `
    CREATE VIRTUAL TABLE IF NOT EXISTS anime_fts USING fts3(
        content='anime',
        title,
        description,
        synonyms
    )
    `;

    const createAnimeTrigger = `
        CREATE TRIGGER IF NOT EXISTS anime_after_insert
        AFTER INSERT ON anime
        BEGIN
            INSERT INTO anime_fts(rowid, title, synonyms, description)
            VALUES (new.id, new.title, new.synonyms, new.description);
        END;
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
    db.query(animeFts3).run();
    db.query(createAnimeTrigger).run();
    db.query(manga).run();
    db.query(skipTimes).run();
    db.query(apiKey).run();
};
