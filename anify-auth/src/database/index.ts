import { Database } from "bun:sqlite";

export const db = new Database("db.sqlite");

export const init = async () => {
    const list = `
    CREATE TABLE IF NOT EXISTS "List" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "type" TEXT NOT NULL,
        "userId" TEXT NOT NULL,
        CONSTRAINT "List_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
    `;
    const entry = `
    CREATE TABLE IF NOT EXISTS "Entry" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "listId" TEXT NOT NULL,
        "status" TEXT NOT NULL,
        "score" INTEGER NOT NULL,
        "progress" INTEGER NOT NULL,
        "progressVolumes" INTEGER NOT NULL,
        "repeat" INTEGER NOT NULL,
        "priority" INTEGER NOT NULL,
        "private" BOOLEAN NOT NULL,
        "mappings" TEXT NOT NULL,
        "notes" TEXT,
        "hiddenFromStatusLists" BOOLEAN NOT NULL,
        "startedAt" DATETIME,
        "completedAt" DATETIME,
        "updatedAt" DATETIME,
        "createdAt" DATETIME,
        CONSTRAINT "Entry_listId_fkey" FOREIGN KEY ("listId") REFERENCES "List" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
    `;
    const advancedScores = `
    CREATE TABLE IF NOT EXISTS "AdvancedScores" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "entryId" TEXT NOT NULL,
        "story" INTEGER NOT NULL,
        "characters" INTEGER NOT NULL,
        "visuals" INTEGER NOT NULL,
        "audio" INTEGER NOT NULL,
        "enjoyment" INTEGER NOT NULL,
        "updatedAt" DATETIME,
        "createdAt" DATETIME,
        CONSTRAINT "AdvancedScores_entryId_fkey" FOREIGN KEY ("entryId") REFERENCES "Entry" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
    `;
    const userSettings = `
    CREATE TABLE IF NOT EXISTS "UserSettings" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "userId" TEXT NOT NULL,
        "autoSkip" BOOLEAN NOT NULL DEFAULT false,
        "autoFullscreen" BOOLEAN NOT NULL DEFAULT false,
        "autoNext" BOOLEAN NOT NULL DEFAULT false,
        "fontSize" TEXT NOT NULL DEFAULT '1rem 1.5rem',
        "fontWidth" TEXT NOT NULL DEFAULT '200',
        "titleLanguage" TEXT NOT NULL DEFAULT 'english',
        "displayAdultContent" BOOLEAN NOT NULL DEFAULT false,
        "airingNotifications" BOOLEAN NOT NULL DEFAULT false,
        "updatedAt" DATETIME,
        "createdAt" DATETIME,
        CONSTRAINT "UserSettings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
    );
    `;
    const scoreKey = `CREATE UNIQUE INDEX "AdvancedScores_entryId_key" ON "AdvancedScores"("entryId");`;
    const userSettingsKey = `CREATE UNIQUE INDEX "UserSettings_userId_key" ON "UserSettings"("userId");`;
    const user = `
    CREATE TABLE IF NOT EXISTS "User" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "username" TEXT NOT NULL,
        "password" TEXT NOT NULL,
        "salt" TEXT NOT NULL,
        "simklId" TEXT,
        "anilistId" TEXT,
        "malId" TEXT
    );
    `;
    const userKey = `CREATE UNIQUE INDEX "User_username_key" ON "User"("username");`;

    await db.query(list).run();
    await db.query(entry).run();
    await db.query(advancedScores).run();
    await db.query(userSettings).run();

    const scoreKeyExists = await db.query(`SELECT name FROM sqlite_master WHERE type='index' AND name='AdvancedScores_entryId_key';`).get();
    if (!scoreKeyExists) await db.query(scoreKey).run();

    const userSettingsKeyExists = await db.query(`SELECT name FROM sqlite_master WHERE type='index' AND name='UserSettings_userId_key';`).get();
    if (!userSettingsKeyExists) await db.query(userSettingsKey).run();

    await db.query(user).run();

    const userKeyExists = await db.query(`SELECT name FROM sqlite_master WHERE type='index' AND name='User_username_key';`).get();
    if (!userKeyExists) await db.query(userKey).run();
};
