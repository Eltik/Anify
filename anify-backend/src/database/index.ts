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

    const animeFts = `
    CREATE VIRTUAL TABLE IF NOT EXISTS anime_fts USING fts5(
        id UNINDEXED,
        slug,
        coverImage,
        bannerImage,
        trailer,
        status,
        season,
        title,
        currentEpisode,
        mappings,
        synonyms,
        countryOfOrigin,
        description,
        duration,
        color,
        year,
        rating,
        popularity,
        type,
        format,
        relations,
        totalEpisodes,
        genres,
        tags,
        episodes,
        averageRating,
        averagePopularity,
        artwork,
        characters
    )
    `;

    const createAnimeTrigger = `
        CREATE TRIGGER IF NOT EXISTS anime_after_insert
        AFTER INSERT ON anime
        BEGIN
            INSERT INTO anime_fts
            VALUES (
                new.id,
                new.slug,
                new.coverImage,
                new.bannerImage,
                new.trailer,
                new.status,
                new.season,
                new.title,
                new.currentEpisode,
                new.mappings,
                new.synonyms,
                new.countryOfOrigin,
                new.description,
                new.duration,
                new.color,
                new.year,
                new.rating,
                new.popularity,
                new.type,
                new.format,
                new.relations,
                new.totalEpisodes,
                new.genres,
                new.tags,
                new.episodes,
                new.averageRating,
                new.averagePopularity,
                new.artwork,
                new.characters
            );
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

    const mangaFts = `
    CREATE VIRTUAL TABLE IF NOT EXISTS manga_fts USING fts5(
        id UNINDEXED,
        slug,
        coverImage,
        bannerImage,
        status,
        title,
        mappings,
        synonyms,
        countryOfOrigin,
        description,
        duration,
        color,
        year,
        rating,
        popularity,
        type,
        format,
        relations,
        currentChapter,
        totalChapters,
        totalVolumes,
        genres,
        tags,
        chapters,
        averageRating,
        averagePopularity,
        artwork,
        characters
    )
    `;

    const createMangaTrigger = `
        CREATE TRIGGER IF NOT EXISTS manga_after_insert
        AFTER INSERT ON manga
        BEGIN
            INSERT INTO manga_fts
            VALUES (
                new.id,
                new.slug,
                new.coverImage,
                new.bannerImage,
                new.status,
                new.title,
                new.mappings,
                new.synonyms,
                new.countryOfOrigin,
                new.description,
                new.duration,
                new.color,
                new.year,
                new.rating,
                new.popularity,
                new.type,
                new.format,
                new.relations,
                new.currentChapter,
                new.totalChapters,
                new.totalVolumes,
                new.genres,
                new.tags,
                new.chapters,
                new.averageRating,
                new.averagePopularity,
                new.artwork,
                new.characters
            );
        END;
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
    db.query(animeFts).run();
    db.query(createAnimeTrigger).run();
    db.query(manga).run();
    db.query(mangaFts).run();
    db.query(createMangaTrigger).run();
    db.query(skipTimes).run();
    db.query(apiKey).run();
};
