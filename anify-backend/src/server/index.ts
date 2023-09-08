import express from "express";
import { rateLimit } from "express-rate-limit";

import cluster from "node:cluster";
import os from "node:os";

import bodyParser from "body-parser";
import cors from "cors";
import cookieParser from "cookie-parser";
import expressDomainMiddleware from "express-domain-middleware";

import Redis from "ioredis";
import RedisStore from "rate-limit-redis";

import colors from "colors";

import queues from "../worker";
import { ANIME_PROVIDERS, Anime, Format, Genres, INFORMATION_PROVIDERS, MANGA_PROVIDERS, META_PROVIDERS, Manga, Type, infoProviders } from "../mapping";
import { fetchEpisodes } from "../content/impl/episodes";
import { fetchChapters } from "../content/impl/chapters";
import { fetchSources } from "../content/impl/sources";
import { fetchPages } from "../content/impl/pages";
import { loadSeasonal } from "../lib/season";
import { loadSkipTimes } from "../lib/skipTimes";
import { SubType } from "../mapping/impl/anime";
import { loadEpisodeCovers } from "../content/impl/episodes/episodeCovers";
import { checkAPIKey, importKeys, masterKey, updateRequests } from "../keys";
import { fetchSchedule } from "../content/impl/schedule";
import Database from "../database";
import { createLoop } from "../tasks";
import { AnimeInfo, MangaInfo } from "../mapping/impl/information";
import { env } from "../env";

const port = env.PORT;

const app = express();
const numCPUs = os.cpus().length;

const corsOptions = {
    origin: "*",
    methods: ["POST", "GET", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
};

let redis = new Redis((env.REDIS_URL as string) || "redis://localhost:6379");

const cacheTime = env.REDIS_CACHE_TIME;

const whitelist = env.API_KEY_WHITELIST;

app.use(cors(corsOptions));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(expressDomainMiddleware);
app.use(cookieParser());

app.get("/", async (request, reply) => {
    return reply.json("Documentation can be viewed at https://docs.anify.tv. Join our Discord https://anify.tv/discord for more information.");
});

app.use(checkAPIKey);

if (!env.REDIS_URL) {
    console.log(colors.yellow("No Redis URL provided. Caching will be disabled."));
    redis = {
        get: async () => null,
        set: (): Promise<"OK"> => Promise.resolve("OK"),
        on: () => Redis.prototype,
        keys: async () => [],
        connect: async () => void 0,
        call: async () => void 0,
    } as any;
} else {
    const statsRateLimit = rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 60,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (request, response) => whitelist.includes(String(request.query.apikey)),
        store: new RedisStore({
            // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
            sendCommand: (...args: string[]) => redis.call(...args),
            prefix: "stats-limiter",
        }),
    });

    const genresRateLimit = rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 80,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (request, response) => whitelist.includes(String(request.query.apikey)),
        store: new RedisStore({
            // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
            sendCommand: (...args: string[]) => redis.call(...args),
            prefix: "stats-limiter",
        }),
    });

    const tagsRateLimit = rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 80,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (request, response) => whitelist.includes(String(request.query.apikey)),
        store: new RedisStore({
            // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
            sendCommand: (...args: string[]) => redis.call(...args),
            prefix: "stats-limiter",
        }),
    });

    const searchRateLimit = rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 25,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (request, response) => whitelist.includes(String(request.query.apikey)),
        store: new RedisStore({
            // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
            sendCommand: (...args: string[]) => redis.call(...args),
            prefix: "search-limiter",
        }),
    });

    const scheduleRateLimit = rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 60,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (request, response) => whitelist.includes(String(request.query.apikey)),
        store: new RedisStore({
            // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
            sendCommand: (...args: string[]) => redis.call(...args),
            prefix: "schedule-limiter",
        }),
    });

    const recentRateLimit = rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 60,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (request, response) => whitelist.includes(String(request.query.apikey)),
        store: new RedisStore({
            // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
            sendCommand: (...args: string[]) => redis.call(...args),
            prefix: "reecnt-limiter",
        }),
    });

    const seasonalRateLimit = rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 50,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (request, response) => whitelist.includes(String(request.query.apikey)),
        store: new RedisStore({
            // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
            sendCommand: (...args: string[]) => redis.call(...args),
            prefix: "seasonal-limiter",
        }),
    });

    const infoRateLimit = rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 75,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (request, response) => whitelist.includes(String(request.query.apikey)),
        store: new RedisStore({
            // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
            sendCommand: (...args: string[]) => redis.call(...args),
            prefix: "info-limiter",
        }),
    });

    const mediaRateLimit = rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 75,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (request, response) => whitelist.includes(String(request.query.apikey)),
        store: new RedisStore({
            // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
            sendCommand: (...args: string[]) => redis.call(...args),
            prefix: "media-limiter",
        }),
    });

    const relationsRateLimit = rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 60,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (request, response) => whitelist.includes(String(request.query.apikey)),
        store: new RedisStore({
            // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
            sendCommand: (...args: string[]) => redis.call(...args),
            prefix: "relations-limiter",
        }),
    });

    const episodesRateLimit = rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 40,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (request, response) => whitelist.includes(String(request.query.apikey)),
        store: new RedisStore({
            // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
            sendCommand: (...args: string[]) => redis.call(...args),
            prefix: "episodes-limiter",
        }),
    });

    const chaptersRateLimit = rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 40,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (request, response) => whitelist.includes(String(request.query.apikey)),
        store: new RedisStore({
            // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
            sendCommand: (...args: string[]) => redis.call(...args),
            prefix: "chapters-limiter",
        }),
    });

    const sourcesRateLimit = rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 60,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (request, response) => whitelist.includes(String(request.query.apikey)),
        store: new RedisStore({
            // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
            sendCommand: (...args: string[]) => redis.call(...args),
            prefix: "sources-limiter",
        }),
    });

    const pagesRateLimit = rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 60,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (request, response) => whitelist.includes(String(request.query.apikey)),
        store: new RedisStore({
            // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
            sendCommand: (...args: string[]) => redis.call(...args),
            prefix: "pages-limiter",
        }),
    });

    const episodeCoversRateLimit = rateLimit({
        windowMs: 1 * 60 * 1000, // 1 minute
        max: 40,
        standardHeaders: true,
        legacyHeaders: false,
        skip: (request, response) => whitelist.includes(String(request.query.apikey)),
        store: new RedisStore({
            // @ts-expect-error - Known issue: the `call` function is not present in @types/ioredis
            sendCommand: (...args: string[]) => redis.call(...args),
            prefix: "episode-covers-limiter",
        }),
    });

    app.use("/stats", statsRateLimit);

    app.use("/genres", genresRateLimit);

    app.use("/tags", tagsRateLimit);

    app.use("/search", searchRateLimit);
    app.use("/search/:type/:query", searchRateLimit);

    app.use("/search-advanced", searchRateLimit);

    app.use("/seasonal", seasonalRateLimit);
    app.use("/seasonal/:type", seasonalRateLimit);

    app.use("/schedule", scheduleRateLimit);

    app.use("/recent", recentRateLimit);

    app.use("/info", infoRateLimit);
    app.use("/info/:id", infoRateLimit);

    app.use("/media", mediaRateLimit);
    app.use("/media/:providerId/:id", mediaRateLimit);

    app.use("/relations", relationsRateLimit);
    app.use("/relations/:id", relationsRateLimit);

    app.use("/episodes", episodesRateLimit);
    app.use("/episodes/:id", episodesRateLimit);
    app.use("/episodes-mal", episodesRateLimit);
    app.use("/episodes-mal/:id", episodesRateLimit);

    app.use("/chapters", chaptersRateLimit);
    app.use("/chapters/:id", chaptersRateLimit);
    app.use("/chapters-mal", chaptersRateLimit);
    app.use("/chapters-mal/:id", chaptersRateLimit);

    app.use("/sources", sourcesRateLimit);
    app.use("/sources-mal", sourcesRateLimit);

    app.use("/pages", pagesRateLimit);
    app.use("/pages-mal", pagesRateLimit);

    app.use("/episode-covers", episodeCoversRateLimit);
    app.use("/episode-covers-mal", episodeCoversRateLimit);
}

app.get("/providers", async (request, reply) => {
    reply.json({
        anime: ANIME_PROVIDERS.map((provider) => {
            return {
                id: provider.id,
                url: provider.url,
                formats: provider.formats,
                subTypes: provider.subTypes,
                headers: provider.headers,
            };
        }),
        manga: MANGA_PROVIDERS.map((provider) => {
            return {
                id: provider.id,
                url: provider.url,
                formats: provider.formats,
            };
        }),
        info: INFORMATION_PROVIDERS.map((provider) => {
            return {
                id: provider.id,
                url: provider.url,
                sharedArea: provider.sharedArea,
                priorityArea: provider.priorityArea,
            };
        }),
        meta: META_PROVIDERS.map((provider) => {
            return {
                id: provider.id,
                url: provider.url,
                formats: provider.formats,
            };
        }),
    });
});

app.get("/stats", async (request, reply) => {
    const cached = await redis.get(`stats`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const data = await Database.count();

    await redis.set(`stats`, JSON.stringify(data), "EX", cacheTime);

    return reply.json(data);
});

app.post("/stats", async (request, reply) => {
    const cached = await redis.get(`stats`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const data = await Database.count();

    await redis.set(`stats`, JSON.stringify(data), "EX", cacheTime);

    return reply.json(data);
});

app.get("/genres", async (request, reply) => {
    const cached = await redis.get(`genres`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const animeGenres = await Database.fetchAll(Type.ANIME);
    const mangaGenres = await Database.fetchAll(Type.MANGA);

    const genres = {
        anime: animeGenres.map((anime) => anime.genres).flat(),
        manga: mangaGenres.map((manga) => manga.genres).flat(),
    };

    // Remove duplicates
    genres.anime = [...new Set(genres.anime)];
    genres.manga = [...new Set(genres.manga)];

    // Combine genres
    const genresList = [...new Set([...genres.anime, ...genres.manga])];

    // Sort by alphabetical order
    genresList.sort();

    await redis.set(`genres`, JSON.stringify(genresList), "EX", cacheTime);

    return reply.json(genresList);
});

app.post("/genres", async (request, reply) => {
    const cached = await redis.get(`genres`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const animeGenres = await Database.fetchAll(Type.ANIME);
    const mangaGenres = await Database.fetchAll(Type.MANGA);

    const genres = {
        anime: animeGenres.map((anime) => anime.genres).flat(),
        manga: mangaGenres.map((manga) => manga.genres).flat(),
    };

    // Remove duplicates
    genres.anime = [...new Set(genres.anime)];
    genres.manga = [...new Set(genres.manga)];

    // Combine genres
    const genresList = [...new Set([...genres.anime, ...genres.manga])];

    // Sort by alphabetical order
    genresList.sort();

    await redis.set(`genres`, JSON.stringify(genresList), "EX", cacheTime);

    return reply.json(genresList);
});

app.get("/tags", async (request, reply) => {
    const cached = await redis.get(`tags`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const animeTags = await Database.fetchAll(Type.ANIME);
    const mangaTags = await Database.fetchAll(Type.MANGA);

    const tags = {
        anime: animeTags.map((anime) => anime.tags).flat(),
        manga: mangaTags.map((manga) => manga.tags).flat(),
    };

    // Remove duplicates
    tags.anime = [...new Set(tags.anime)];
    tags.manga = [...new Set(tags.manga)];

    // Combine genres
    const tagsList = [...new Set([...tags.anime, ...tags.manga])];

    // Sort by alphabetical order
    tagsList.sort();

    await redis.set(`tags`, JSON.stringify(tagsList), "EX", cacheTime);

    return reply.json(tagsList);
});

app.post("/tags", async (request, reply) => {
    const cached = await redis.get(`tags`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const animeTags = await Database.fetchAll(Type.ANIME);
    const mangaTags = await Database.fetchAll(Type.MANGA);

    const tags = {
        anime: animeTags.map((anime) => anime.tags).flat(),
        manga: mangaTags.map((manga) => manga.tags).flat(),
    };

    // Remove duplicates
    tags.anime = [...new Set(tags.anime)];
    tags.manga = [...new Set(tags.manga)];

    // Combine genres
    const tagsList = [...new Set([...tags.anime, ...tags.manga])];

    // Sort by alphabetical order
    tagsList.sort();

    await redis.set(`tags`, JSON.stringify(tagsList), "EX", cacheTime);

    return reply.json(tagsList);
});

/**
 * Searches for items of the given type based on the provided query.
 *
 * @param {String} type - The type of items to search for (anime, manga, novel).
 * @param {String} query - The search query.
 *
 * @throws {400} Invalid type - If the provided type is not valid.
 * @throws {400} Invalid query - If the provided query is invalid.
 */
app.get("/search/:type/:query", async (request, reply) => {
    const { query } = request.params as { query: string };
    let { type } = request.params as { type: string };

    const validTypes = ["anime", "manga", "novel"];
    if (!validTypes.includes(type.toLowerCase())) {
        return reply.status(400).send({ error: "Invalid type" });
    }

    if (!query || query.length === 0) {
        return reply.status(400).send({ error: "Invalid query" });
    }

    const formats = type.toLowerCase() === "anime" ? [Format.MOVIE, Format.TV, Format.TV_SHORT, Format.OVA, Format.ONA, Format.OVA] : type.toLowerCase() === "manga" ? [Format.MANGA, Format.ONE_SHOT] : [Format.NOVEL];

    const originalType = type;

    if (type.toLowerCase().includes("novel")) {
        type = "manga";
    }

    const cached = await redis.get(`search:${originalType}:${query}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const existing = await Database.search(query, type.toUpperCase() as Type, formats, 0, 20);
    if (existing.length === 0) {
        queues.searchQueue.add({ type: type.toUpperCase() as Type, query: query, formats: formats });

        await redis.set(`search:${originalType}:${query}`, JSON.stringify([]), "EX", cacheTime);

        return reply.json([]);
    } else {
        await redis.set(`search:${originalType}:${query}`, JSON.stringify(existing), "EX", cacheTime);

        return reply.json(existing);
    }
});

/**
 * Searches for items of the given type based on the provided query.
 *
 * @param {String} type - The type of items to search for (anime, manga, novel).
 * @param {String} query - The search query.
 *
 * @throws {400} Invalid type - If the provided type is not valid.
 * @throws {400} Invalid query - If the provided query is invalid.
 */
app.get("/search", async (request, reply) => {
    const { query } = request.query as { query: string };
    let { type } = request.query as { type: string };

    const validTypes = ["anime", "manga", "novel"];
    if (!validTypes.includes(type.toLowerCase())) {
        return reply.status(400).send({ error: "Invalid type" });
    }

    if (!query || query.length === 0) {
        return reply.status(400).send({ error: "Invalid query" });
    }

    const formats = type.toLowerCase() === "anime" ? [Format.MOVIE, Format.TV, Format.TV_SHORT, Format.OVA, Format.ONA, Format.OVA] : type.toLowerCase() === "manga" ? [Format.MANGA, Format.ONE_SHOT] : [Format.NOVEL];

    const originalType = type;

    if (type.toLowerCase().includes("novel")) {
        type = "manga";
    }

    const cached = await redis.get(`search:${originalType}:${query}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const existing = await Database.search(query, type.toUpperCase() as Type, formats, 0, 20);
    if (existing.length === 0) {
        queues.searchQueue.add({ type: type.toUpperCase() as Type, query: query, formats: formats });

        await redis.set(`search:${originalType}:${query}`, JSON.stringify([]), "EX", cacheTime);

        return reply.json([]);
    } else {
        await redis.set(`search:${originalType}:${query}`, JSON.stringify(existing), "EX", cacheTime);

        return reply.json(existing);
    }
});

/**
 * Searches for items of the given type based on the provided query.
 *
 * @param {String} type - The type of items to search for (anime, manga, novel).
 * @param {String} query - The search query.
 *
 * @throws {400} Invalid type - If the provided type is not valid.
 * @throws {400} Invalid query - If the provided query is invalid.
 */
app.post("/search", async (request, reply) => {
    const { query } = request.body as any;
    let { type } = request.body as any;

    const validTypes = ["anime", "manga", "novel"];
    if (!validTypes.includes(type.toLowerCase())) {
        return reply.status(400).send({ error: "Invalid type" });
    }

    if (!query || query.length === 0) {
        return reply.status(400).send({ error: "Invalid query" });
    }

    const formats = type.toLowerCase() === "anime" ? [Format.MOVIE, Format.TV, Format.TV_SHORT, Format.OVA, Format.ONA, Format.OVA] : type.toLowerCase() === "manga" ? [Format.MANGA, Format.ONE_SHOT] : [Format.NOVEL];

    const originalType = type;

    if (type.toLowerCase().includes("novel")) {
        type = "manga";
    }

    const cached = await redis.get(`search:${originalType}:${query}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const existing = await Database.search(query, type.toUpperCase(), formats, 0, 20);
    if (existing.length === 0) {
        queues.searchQueue.add({ type: type.toUpperCase(), query: query, formats: formats });

        await redis.set(`search:${originalType}:${query}`, JSON.stringify([]), "EX", cacheTime);

        return reply.json([]);
    } else {
        await redis.set(`search:${originalType}:${query}`, JSON.stringify(existing), "EX", cacheTime);

        return reply.json(existing);
    }
});

app.get("/search-advanced", async (request, reply) => {
    const { query } = request.query as { query: string };
    let { type, page, genres, genresExcluded, tags, tagsExcluded, year } = request.query as { type: string; page: string; genres: string[]; genresExcluded: string[]; tags: string[]; tagsExcluded: string[]; year: string };

    const validTypes = ["anime", "manga", "novel"];
    if (!validTypes.includes(type.toLowerCase())) {
        return reply.status(400).send({ error: "Invalid type" });
    }

    if (!query && String(query).length != 0) {
        return reply.status(400).send({ error: "Invalid query" });
    }

    if (!genres) genres = [];
    if (!genresExcluded) genresExcluded = [];
    if (!tags) tags = [];
    if (!tagsExcluded) tagsExcluded = [];
    if (!year || isNaN(Number(year))) year = "0";

    if (!page || isNaN(Number(page))) page = "1";

    const formats = type.toLowerCase() === "anime" ? [Format.MOVIE, Format.TV, Format.TV_SHORT, Format.OVA, Format.ONA, Format.OVA] : type.toLowerCase() === "manga" ? [Format.MANGA, Format.ONE_SHOT] : [Format.NOVEL];

    const originalType = type;

    if (type.toLowerCase().includes("novel")) {
        type = "manga";
    }

    const cached = await redis.get(`search-genres:${originalType}:${query}:${JSON.stringify(genres)}:${JSON.stringify(genresExcluded)}:${JSON.stringify(tags)}:${JSON.stringify(tagsExcluded)}:${page}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const existing = await Database.searchAdvanced(query, type.toUpperCase() as Type, formats, Number(page), 40, genres as Genres[], genresExcluded as Genres[], Number(year), tags, tagsExcluded);
    if (existing.length === 0) {
        const newData: Anime[] | Manga[] = [];

        const data: AnimeInfo[] | MangaInfo[] | undefined = await (infoProviders.anilist as any).searchAdvanced(query, type.toUpperCase() as Type, formats, Number(page), 2, genres as Genres[], genresExcluded as Genres[], Number(year), tags, tagsExcluded);
        for (let i = 0; i < (data ?? []).length; i++) {
            const item = data![i];
            const possible = await Database.info((item as any).aniListId);
            if (possible) {
                let canPush = true;

                for (const genre of genres) {
                    if (!possible.genres.includes(genre as Genres)) {
                        canPush = false;
                        break;
                    }
                }
                for (const tag of tags) {
                    if (!possible.tags.includes(tag)) {
                        canPush = false;
                        break;
                    }
                }
                for (const genre of genresExcluded) {
                    if (possible.genres.includes(genre as Genres)) {
                        canPush = false;
                        break;
                    }
                }
                for (const tag of tagsExcluded) {
                    if (possible.tags.includes(tag)) {
                        canPush = false;
                        break;
                    }
                }

                if (canPush) newData.push(possible as any);
            } else {
                queues.mappingQueue.add({ id: (item as any).aniListId, type: type.toUpperCase() as Type });
            }
        }

        if (newData.length === 0) {
            if (genres.length === 0 && genresExcluded.length === 0 && tags.length === 0 && Number(year) === 0 && tagsExcluded.length === 0) {
                const data: AnimeInfo[] | MangaInfo[] | undefined = await (infoProviders.anilist as any).search(query, type.toUpperCase() as Type, formats, page, 2);
                for (let i = 0; i < (data ?? []).length; i++) {
                    const item = data![i];
                    const possible = await Database.info((item as any).aniListId);
                    if (possible) newData.push(possible as any);
                    else queues.mappingQueue.add({ id: (item as any).aniListId, type: type.toUpperCase() as Type });
                }

                await redis.set(`search-advanced:${originalType}:${query}:${JSON.stringify(genres)}:${JSON.stringify(genresExcluded)}:${JSON.stringify(tags)}:${JSON.stringify(tagsExcluded)}:${page}`, JSON.stringify(newData), "EX", cacheTime);
                return reply.json(newData);
            }
        }

        await redis.set(`search-advanced:${originalType}:${query}:${JSON.stringify(genres)}:${JSON.stringify(genresExcluded)}:${JSON.stringify(tags)}:${JSON.stringify(tagsExcluded)}:${page}`, JSON.stringify(newData), "EX", cacheTime);
        return reply.json(newData);
    } else {
        await redis.set(`search-advanced:${originalType}:${query}:${JSON.stringify(genres)}:${JSON.stringify(genresExcluded)}:${JSON.stringify(tags)}:${JSON.stringify(tagsExcluded)}:${page}`, JSON.stringify(existing), "EX", cacheTime);

        return reply.json(existing);
    }
});

app.post("/search-advanced", async (request, reply) => {
    const { query } = request.body as { query: string };
    let { type, page, genres, genresExcluded, tags, tagsExcluded, year } = request.body as { type: string; page: number; genres: string[]; genresExcluded: string[]; tags: string[]; tagsExcluded: string[]; year: number };

    const validTypes = ["anime", "manga", "novel"];
    if (!validTypes.includes(type.toLowerCase())) {
        return reply.status(400).send({ error: "Invalid type" });
    }

    if (!query && String(query).length != 0) {
        return reply.status(400).send({ error: "Invalid query" });
    }

    if (!genres) genres = [];
    if (!genresExcluded) genresExcluded = [];
    if (!tags) tags = [];
    if (!tagsExcluded) tagsExcluded = [];
    if (!year) year = 0;

    if (!page) page = 1;

    const formats = type.toLowerCase() === "anime" ? [Format.MOVIE, Format.TV, Format.TV_SHORT, Format.OVA, Format.ONA, Format.OVA] : type.toLowerCase() === "manga" ? [Format.MANGA, Format.ONE_SHOT] : [Format.NOVEL];

    const originalType = type;

    if (type.toLowerCase().includes("novel")) {
        type = "manga";
    }

    const cached = await redis.get(`search-advanced:${originalType}:${query}:${JSON.stringify(genres)}:${JSON.stringify(genresExcluded)}:${JSON.stringify(tags)}:${JSON.stringify(tagsExcluded)}:${page}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const existing = await Database.searchAdvanced(query, type.toUpperCase() as Type, formats, page, 40, genres as Genres[], genresExcluded as Genres[], year, tags, tagsExcluded);
    if (existing.length === 0) {
        const newData: Anime[] | Manga[] = [];

        const data: AnimeInfo[] | MangaInfo[] | undefined = await (infoProviders.anilist as any).searchAdvanced(query, type.toUpperCase() as Type, formats, Number(page), 2, genres as Genres[], genresExcluded as Genres[], Number(year), tags, tagsExcluded);
        for (let i = 0; i < (data ?? []).length; i++) {
            const item = data![i];
            const possible = await Database.info((item as any).aniListId);
            if (possible) {
                let canPush = true;

                for (const genre of genres) {
                    if (!possible.genres.includes(genre as Genres)) {
                        canPush = false;
                        break;
                    }
                }
                for (const tag of tags) {
                    if (!possible.tags.includes(tag)) {
                        canPush = false;
                        break;
                    }
                }
                for (const genre of genresExcluded) {
                    if (possible.genres.includes(genre as Genres)) {
                        canPush = false;
                        break;
                    }
                }
                for (const tag of tagsExcluded) {
                    if (possible.tags.includes(tag)) {
                        canPush = false;
                        break;
                    }
                }

                if (canPush) newData.push(possible as any);
            } else {
                queues.mappingQueue.add({ id: (item as any).aniListId, type: type.toUpperCase() as Type });
            }
        }

        if (newData.length === 0) {
            if (genres.length === 0 && genresExcluded.length === 0 && tags.length === 0 && Number(year) === 0 && tagsExcluded.length === 0) {
                const data: AnimeInfo[] | MangaInfo[] | undefined = await (infoProviders.anilist as any).search(query, type.toUpperCase() as Type, formats, page, 2);
                for (let i = 0; i < (data ?? []).length; i++) {
                    const item = data![i];
                    const possible = await Database.info((item as any).aniListId);
                    if (possible) newData.push(possible as any);
                    else queues.mappingQueue.add({ id: (item as any).aniListId, type: type.toUpperCase() as Type });
                }

                await redis.set(`search-advanced:${originalType}:${query}:${JSON.stringify(genres)}:${JSON.stringify(genresExcluded)}:${JSON.stringify(tags)}:${JSON.stringify(tagsExcluded)}:${page}`, JSON.stringify(newData), "EX", cacheTime);
                return reply.json(newData);
            }
        }

        await redis.set(`search-advanced:${originalType}:${query}:${JSON.stringify(genres)}:${JSON.stringify(genresExcluded)}:${JSON.stringify(tags)}:${JSON.stringify(tagsExcluded)}:${page}`, JSON.stringify(newData), "EX", cacheTime);
        return reply.json(newData);
    } else {
        await redis.set(`search-advanced:${originalType}:${query}:${JSON.stringify(genres)}:${JSON.stringify(genresExcluded)}:${JSON.stringify(tags)}:${JSON.stringify(tagsExcluded)}:${page}`, JSON.stringify(existing), "EX", cacheTime);

        return reply.json(existing);
    }
});

/**
 * Retrieves seasonal items of the given type.
 *
 * @param {String} type - The type of items to retrieve (anime, manga, novel).
 *
 * @throws {400} Invalid type - If the provided type is not valid.
 */
app.get("/seasonal/:type", async (request, reply) => {
    let { type } = request.params as { type: string };

    if (!type || (type.toLowerCase() !== "anime" && type.toLowerCase() !== "manga" && type.toLowerCase() !== "novel")) {
        return reply.status(400).send({ error: "Invalid type" });
    }

    const formats = type.toLowerCase() === "anime" ? [Format.MOVIE, Format.TV, Format.TV_SHORT, Format.OVA, Format.ONA, Format.OVA] : type.toLowerCase() === "manga" ? [Format.MANGA, Format.ONE_SHOT] : [Format.NOVEL];

    const originalType = type;

    if (type.toLowerCase().includes("novel")) {
        type = "manga";
    }

    const cached = await redis.get(`seasonal:${originalType}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const aniListData = await loadSeasonal({ type: type.toUpperCase() as Type, formats: formats });
    const data = await Database.seasonal(aniListData?.trending, aniListData?.popular, aniListData?.top, aniListData?.seasonal);

    await redis.set(`seasonal:${originalType}`, JSON.stringify(data), "EX", cacheTime);

    return reply.json(data);
});

/**
 * Retrieves seasonal items of the given type.
 *
 * @param {String} type - The type of items to retrieve (anime, manga, novel).
 *
 * @throws {400} Invalid type - If the provided type is not valid.
 */
app.get("/seasonal", async (request, reply) => {
    let { type } = request.query as { type: string };

    if (!type || (type.toLowerCase() !== "anime" && type.toLowerCase() !== "manga" && type.toLowerCase() !== "novel")) {
        return reply.status(400).send({ error: "Invalid type" });
    }

    const formats = type.toLowerCase() === "anime" ? [Format.MOVIE, Format.TV, Format.TV_SHORT, Format.OVA, Format.ONA, Format.OVA] : type.toLowerCase() === "manga" ? [Format.MANGA, Format.ONE_SHOT] : [Format.NOVEL];

    const originalType = type;

    if (type.toLowerCase().includes("novel")) {
        type = "manga";
    }

    const cached = await redis.get(`seasonal:${originalType}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const aniListData = await loadSeasonal({ type: type.toUpperCase() as Type, formats: formats });
    const data = await Database.seasonal(aniListData?.trending, aniListData?.popular, aniListData?.top, aniListData?.seasonal);

    await redis.set(`seasonal:${originalType}`, JSON.stringify(data), "EX", cacheTime);

    return reply.json(data);
});

/**
 * Retrieves seasonal items of the given type.
 *
 * @param {String} type - The type of items to retrieve (anime, manga, novel).
 *
 * @throws {400} Invalid type - If the provided type is not valid.
 */
app.post("/seasonal", async (request, reply) => {
    let { type } = request.body as { type: string };

    if (!type || (type.toLowerCase() !== "anime" && type.toLowerCase() !== "manga" && type.toLowerCase() !== "novel")) {
        return reply.status(400).send({ error: "Invalid type" });
    }

    const formats = type.toLowerCase() === "anime" ? [Format.MOVIE, Format.TV, Format.TV_SHORT, Format.OVA, Format.ONA, Format.OVA] : type.toLowerCase() === "manga" ? [Format.MANGA, Format.ONE_SHOT] : [Format.NOVEL];

    const originalType = type;

    if (type.toLowerCase().includes("novel")) {
        type = "manga";
    }

    const cached = await redis.get(`seasonal:${originalType}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const aniListData = await loadSeasonal({ type: type.toUpperCase() as Type, formats: formats });
    const data = await Database.seasonal(aniListData?.trending, aniListData?.popular, aniListData?.top, aniListData?.seasonal);

    await redis.set(`seasonal:${originalType}`, JSON.stringify(data), "EX", cacheTime);

    return reply.json(data);
});

app.get("/schedule", async (request, reply) => {
    const cached = await redis.get(`schedule`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const data = await fetchSchedule();

    await redis.set(`schedule`, JSON.stringify(data), "EX", cacheTime);

    return reply.json(data);
});

app.post("/schedule", async (request, reply) => {
    const cached = await redis.get(`schedule`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const data = await fetchSchedule();

    await redis.set(`schedule`, JSON.stringify(data), "EX", cacheTime);

    return reply.json(data);
});

app.get("/recent", async (request, reply) => {
    let { type, page } = request.query as { type: string; page: string };
    if (!page || isNaN(Number(page))) page = "1";

    if (!type || (type.toLowerCase() !== "anime" && type.toLowerCase() !== "manga" && type.toLowerCase() !== "novel")) {
        return reply.status(400).send({ error: "Invalid type" });
    }

    const formats = type.toLowerCase() === "anime" ? [Format.MOVIE, Format.TV, Format.TV_SHORT, Format.OVA, Format.ONA, Format.OVA] : type.toLowerCase() === "manga" ? [Format.MANGA, Format.ONE_SHOT] : [Format.NOVEL];

    const originalType = type;

    if (type.toLowerCase().includes("novel")) {
        type = "manga";
    }

    const cached = await redis.get(`recent:${originalType}:${page}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const data = await Database.recent(type.toUpperCase() as Type, formats, Number(page));

    await redis.set(`recent:${originalType}:${page}`, JSON.stringify(data), "EX", cacheTime);

    return reply.json(data);
});

app.post("/recent", async (request, reply) => {
    let { type, page } = request.body as { type: string; page: number };
    if (!page) page = 1;

    if (!type || (type.toLowerCase() !== "anime" && type.toLowerCase() !== "manga" && type.toLowerCase() !== "novel")) {
        return reply.status(400).send({ error: "Invalid type" });
    }

    const formats = type.toLowerCase() === "anime" ? [Format.MOVIE, Format.TV, Format.TV_SHORT, Format.OVA, Format.ONA, Format.OVA] : type.toLowerCase() === "manga" ? [Format.MANGA, Format.ONE_SHOT] : [Format.NOVEL];

    const originalType = type;

    if (type.toLowerCase().includes("novel")) {
        type = "manga";
    }

    const cached = await redis.get(`recent:${originalType}:${page}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const data = await Database.recent(type.toUpperCase() as Type, formats, page);

    await redis.set(`recent:${originalType}:${page}`, JSON.stringify(data), "EX", cacheTime);

    return reply.json(data);
});

/**
 * Retrieves information for a media.
 *
 * @param {String} id - The ID to get information about.
 *
 * @throws {400} Invalid ID - If there is no provided ID.
 * @throws {404} Not found - If the provided ID is not found in the database.
 */
app.get("/info/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!id || id.length === 0) {
        return reply.status(400).send({ error: "Invalid ID" });
    }

    const cached = await redis.get(`info:${id}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const existing = await Database.info(id);
    if (existing) {
        await redis.set(`info:${id}`, JSON.stringify(existing), "EX", cacheTime);

        return reply.json(existing);
    }
    return reply.status(404).send({ error: "Not found" });
});

/**
 * Retrieves information for a media.
 *
 * @param {String} id - The ID to get information about.
 *
 * @throws {400} Invalid ID - If there is no provided ID.
 * @throws {404} Not found - If the provided ID is not found in the database.
 */
app.get("/info", async (request, reply) => {
    const { id } = request.query as { id: string };

    if (!id || id.length === 0) {
        return reply.status(400).send({ error: "Invalid ID" });
    }

    const cached = await redis.get(`info:${id}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const existing = await Database.info(id);
    if (existing) {
        await redis.set(`info:${id}`, JSON.stringify(existing), "EX", cacheTime);

        return reply.json(existing);
    }
    return reply.status(404).send({ error: "Not found" });
});

/**
 * Retrieves information for a media.
 *
 * @param {String} id - The ID to get information about.
 *
 * @throws {400} Invalid ID - If there is no provided ID.
 * @throws {404} Not found - If the provided ID is not found in the database.
 */
app.post("/info", async (request, reply) => {
    const { id } = request.body as { id: string };

    if (!id || id.length === 0) {
        return reply.status(400).send({ error: "Invalid ID" });
    }

    const cached = await redis.get(`info:${id}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const existing = await Database.info(id);
    if (existing) {
        await redis.set(`info:${id}`, JSON.stringify(existing), "EX", cacheTime);

        return reply.json(existing);
    }
    return reply.status(404).send({ error: "Not found" });
});

/**
 * Retrieves information for a media.
 *
 * @param {String} id - The ID to get information about.
 *
 * @throws {400} Invalid provider ID - If there is no provided provider ID.
 * @throws {400} Invalid ID - If there is no provided ID.
 * @throws {404} Not found - If the provided ID is not found in the database.
 */
app.get("/media/:providerId/:id", async (request, reply) => {
    const { providerId, id } = request.params as { providerId: string; id: string };

    if (!providerId || providerId.length === 0) {
        return reply.status(400).send({ error: "Invalid provider ID" });
    }

    if (!id || id.length === 0) {
        return reply.status(400).send({ error: "Invalid ID" });
    }

    const cached = await redis.get(`media:${providerId}:${id}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const existing = await Database.media(providerId, id);
    if (existing) {
        await redis.set(`media:${providerId}:${id}`, JSON.stringify(existing), "EX", cacheTime);

        return reply.json(existing);
    }
    return reply.status(404).send({ error: "Not found" });
});

/**
 * Retrieves information for a media.
 *
 * @param {String} id - The ID to get information about.
 *
 * @throws {400} Invalid provider ID - If there is no provided provider ID.
 * @throws {400} Invalid ID - If there is no provided ID.
 * @throws {404} Not found - If the provided ID is not found in the database.
 */
app.get("/media", async (request, reply) => {
    const { providerId, id } = request.query as { providerId: string; id: string };

    if (!providerId || providerId.length === 0) {
        return reply.status(400).send({ error: "Invalid provider ID" });
    }

    if (!id || id.length === 0) {
        return reply.status(400).send({ error: "Invalid ID" });
    }

    const cached = await redis.get(`media:${providerId}:${id}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const existing = await Database.media(providerId, id);
    if (existing) {
        await redis.set(`media:${providerId}:${id}`, JSON.stringify(existing), "EX", cacheTime);

        return reply.json(existing);
    }
    return reply.status(404).send({ error: "Not found" });
});

/**
 * Retrieves information for a media.
 *
 * @param {String} id - The ID to get information about.
 *
 * @throws {400} Invalid provider ID - If there is no provided provider ID.
 * @throws {400} Invalid ID - If there is no provided ID.
 * @throws {404} Not found - If the provided ID is not found in the database.
 */
app.post("/media", async (request, reply) => {
    const { providerId, id } = request.body as { providerId: string; id: string };

    if (!providerId || providerId.length === 0) {
        return reply.status(400).send({ error: "Invalid provider ID" });
    }

    if (!id || id.length === 0) {
        return reply.status(400).send({ error: "Invalid ID" });
    }

    const cached = await redis.get(`media:${providerId}:${id}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const existing = await Database.media(providerId, id);
    if (existing) {
        await redis.set(`media:${providerId}:${id}`, JSON.stringify(existing), "EX", cacheTime);

        return reply.json(existing);
    }
    return reply.status(404).send({ error: "Not found" });
});

/**
 * Retrieves relations for a media.
 *
 * @param {String} id - The ID to get information about.
 *
 * @throws {400} Invalid ID - If there is no provided ID.
 * @throws {404} Not found - If the provided ID is not found in the database.
 */
app.get("/relations/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!id || id.length === 0) {
        return reply.status(400).send({ error: "Invalid ID" });
    }

    const cached = await redis.get(`relations:${id}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const existing = await Database.relations(id);
    if (existing) {
        await redis.set(`relations:${id}`, JSON.stringify(existing), "EX", cacheTime);

        return reply.json(existing);
    }
    return reply.status(404).send({ error: "Not found" });
});

/**
 * Retrieves relations for a media.
 *
 * @param {String} id - The ID to get information about.
 *
 * @throws {400} Invalid ID - If there is no provided ID.
 * @throws {404} Not found - If the provided ID is not found in the database.
 */
app.get("/relations", async (request, reply) => {
    const { id } = request.query as { id: string };

    if (!id || id.length === 0) {
        return reply.status(400).send({ error: "Invalid ID" });
    }

    const cached = await redis.get(`relations:${id}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const existing = await Database.relations(id);
    if (existing) {
        await redis.set(`relations:${id}`, JSON.stringify(existing), "EX", cacheTime);

        return reply.json(existing);
    }
    return reply.status(404).send({ error: "Not found" });
});

/**
 * Retrieves relations for a media.
 *
 * @param {String} id - The ID to get information about.
 *
 * @throws {400} Invalid ID - If there is no provided ID.
 * @throws {404} Not found - If the provided ID is not found in the database.
 */
app.post("/relations", async (request, reply) => {
    const { id } = request.body as { id: string };

    if (!id || id.length === 0) {
        return reply.status(400).send({ error: "Invalid ID" });
    }

    const cached = await redis.get(`relations:${id}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const existing = await Database.relations(id);
    if (existing) {
        await redis.set(`relations:${id}`, JSON.stringify(existing), "EX", cacheTime);

        return reply.json(existing);
    }
    return reply.status(404).send({ error: "Not found" });
});

/**
 * Retrieves episodes for a media.
 *
 * @param {String} id - The ID to get episodes from.
 *
 * @throws {400} Invalid ID - If there is no provided ID.
 * @throws {404} Not found - If the provided ID is not found in the database or there are no episodes.
 */
app.get("/episodes/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!id || id.length === 0) {
        return reply.status(400).send({ error: "Invalid ID" });
    }

    const cached = await redis.get(`episodes:${id}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const existing = await fetchEpisodes(id);
    if (existing) {
        await redis.set(`episodes:${id}`, JSON.stringify(existing), "EX", cacheTime);

        return reply.json(existing);
    }
    return reply.status(404).send({ error: "Not found" });
});

/**
 * Retrieves episodes for a media.
 *
 * @param {String} id - The ID to get episodes from.
 *
 * @throws {400} Invalid ID - If there is no provided ID.
 * @throws {404} Not found - If the provided ID is not found in the database or there are no episodes.
 */
app.get("/episodes", async (request, reply) => {
    const { id } = request.query as { id: string };

    if (!id || id.length === 0) {
        return reply.status(400).send({ error: "Invalid ID" });
    }

    const cached = await redis.get(`episodes:${id}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const existing = await fetchEpisodes(id);
    if (existing) {
        await redis.set(`episodes:${id}`, JSON.stringify(existing), "EX", cacheTime);

        return reply.json(existing);
    }
    return reply.status(404).send({ error: "Not found" });
});

/**
 * Retrieves episodes for a media.
 *
 * @param {String} id - The ID to get episodes from.
 *
 * @throws {400} Invalid ID - If there is no provided ID.
 * @throws {404} Not found - If the provided ID is not found in the database or there are no episodes.
 */
app.post("/episodes", async (request, reply) => {
    const { id } = request.body as { id: string };

    if (!id || id.length === 0) {
        return reply.status(400).send({ error: "Invalid ID" });
    }

    const cached = await redis.get(`episodes:${id}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const existing = await fetchEpisodes(id);
    if (existing) {
        await redis.set(`episodes:${id}`, JSON.stringify(existing), "EX", cacheTime);

        return reply.json(existing);
    }
    return reply.status(404).send({ error: "Not found" });
});

/**
 * Retrieves chapters for a media.
 *
 * @param {String} id - The ID to get chapters from.
 *
 * @throws {400} Invalid ID - If there is no provided ID.
 * @throws {404} Not found - If the provided ID is not found in the database or there are no chapters.
 */
app.get("/chapters/:id", async (request, reply) => {
    const { id } = request.params as { id: string };

    if (!id || id.length === 0) {
        return reply.status(400).send({ error: "Invalid ID" });
    }

    const cached = await redis.get(`chapters:${id}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const existing = await fetchChapters(id);
    if (existing) {
        await redis.set(`chapters:${id}`, JSON.stringify(existing), "EX", cacheTime);

        return reply.json(existing);
    }
    return reply.status(404).send({ error: "Not found" });
});

/**
 * Retrieves chapters for a media.
 *
 * @param {String} id - The ID to get chapters from.
 *
 * @throws {400} Invalid ID - If there is no provided ID.
 * @throws {404} Not found - If the provided ID is not found in the database or there are no chapters.
 */
app.get("/chapters", async (request, reply) => {
    const { id } = request.query as { id: string };

    if (!id || id.length === 0) {
        return reply.status(400).send({ error: "Invalid ID" });
    }

    const cached = await redis.get(`chapters:${id}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const existing = await fetchChapters(id);
    if (existing) {
        await redis.set(`chapters:${id}`, JSON.stringify(existing), "EX", cacheTime);

        return reply.json(existing);
    }
    return reply.status(404).send({ error: "Not found" });
});

/**
 * Retrieves chapters for a media.
 *
 * @param {String} id - The ID to get chapters from.
 *
 * @throws {400} Invalid ID - If there is no provided ID.
 * @throws {404} Not found - If the provided ID is not found in the database or there are no chapters.
 */
app.post("/chapters", async (request, reply) => {
    const { id } = request.body as { id: string };

    if (!id || id.length === 0) {
        return reply.status(400).send({ error: "Invalid ID" });
    }

    const cached = await redis.get(`chapters:${id}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const existing = await fetchChapters(id);
    if (existing) {
        await redis.set(`chapters:${id}`, JSON.stringify(existing), "EX", cacheTime);

        return reply.json(existing);
    }
    return reply.status(404).send({ error: "Not found" });
});

app.get("/sources", async (request, reply) => {
    const { providerId, watchId, episode, id, server } = request.query as any;
    let { subType } = request.query as any;

    if (!providerId || providerId.length === 0) {
        return reply.status(400).send({ error: "Invalid provider ID." });
    }

    if (!watchId || watchId.length === 0) {
        return reply.status(400).send({ error: "Invalid watch ID." });
    }

    if (!episode) {
        return reply.status(400).send({ error: "Invalid episode." });
    }

    if (subType && subType.toLowerCase() != SubType.DUB && subType.toLowerCase() != SubType.SUB) {
        return reply.status(400).send({ error: "Invalid subtype given." });
    }

    if (!subType) subType = SubType.SUB;

    if (!id || id.length === 0) {
        return reply.status(400).send({ error: "Invalid ID." });
    }

    const cached = await redis.get(`sources:${providerId}:${watchId}:${server}:${subType}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const existing = await fetchSources(providerId, watchId, subType, server);
    if (existing) {
        const skipTimes = await loadSkipTimes({ toInsert: existing, id: id, episode: episode }).catch((err) => {
            return {
                intro: {
                    start: 0,
                    end: 0,
                },
                outro: {
                    start: 0,
                    end: 0,
                },
            };
        });

        existing.intro = skipTimes?.intro ?? {
            start: 0,
            end: 0,
        };
        existing.outro = skipTimes?.outro ?? {
            start: 0,
            end: 0,
        };

        await redis.set(`sources:${providerId}:${watchId}:${server}:${subType}`, JSON.stringify(existing), "EX", cacheTime);

        return reply.json(existing);
    }

    return reply.status(404).send({ error: "Not found", sources: existing });
});

app.post("/sources", async (request, reply) => {
    const { providerId, watchId, server, episode, id } = request.body as any;
    let { subType } = request.body as any;

    if (!providerId || providerId.length === 0) {
        return reply.status(400).send({ error: "Invalid provider ID." });
    }

    if (!watchId || watchId.length === 0) {
        return reply.status(400).send({ error: "Invalid watch ID." });
    }

    if (!episode) {
        return reply.status(400).send({ error: "Invalid episode." });
    }

    if (subType && subType.toLowerCase() != SubType.DUB && subType.toLowerCase() != SubType.SUB) {
        return reply.status(400).send({ error: "Invalid subtype given." });
    }
    if (!subType) subType = SubType.SUB;

    if (!id || id.length === 0) {
        return reply.status(400).send({ error: "Invalid ID." });
    }

    const cached = await redis.get(`sources:${providerId}:${watchId}:${server}:${subType}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const existing = await fetchSources(providerId, watchId, subType, server);
    if (existing) {
        const skipTimes = await loadSkipTimes({ toInsert: existing, id: id, episode: episode }).catch((err) => {
            return {
                intro: {
                    start: 0,
                    end: 0,
                },
                outro: {
                    start: 0,
                    end: 0,
                },
            };
        });

        existing.intro = skipTimes?.intro ?? {
            start: 0,
            end: 0,
        };
        existing.outro = skipTimes?.outro ?? {
            start: 0,
            end: 0,
        };

        await redis.set(`sources:${providerId}:${watchId}:${server}:${subType}`, JSON.stringify(existing), "EX", cacheTime);

        return reply.json(existing);
    }

    return reply.status(404).send({ error: "Not found", sources: existing });
});

app.get("/skip-times/:id", async (request, reply) => {
    const { id } = request.params as any;

    if (!id) {
        return reply.status(400).send({ error: "Invalid ID." });
    }

    const cached = await redis.get(`skip-times:${id}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const skipTimes = await Database.findSkipTimes(id).catch((err) => {
        return {
            intro: {
                start: 0,
                end: 0,
            },
            outro: {
                start: 0,
                end: 0,
            },
        };
    });

    if (!skipTimes) {
        return reply.status(404).send({ error: "Not found." });
    }

    await redis.set(`skip-times:${id}`, JSON.stringify(skipTimes), "EX", cacheTime);

    return reply.json(skipTimes);
});

app.get("/skip-times", async (request, reply) => {
    const { id } = request.query as any;

    if (!id) {
        return reply.status(400).send({ error: "Invalid ID." });
    }

    const cached = await redis.get(`skip-times:${id}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const skipTimes = await Database.findSkipTimes(id).catch((err) => {
        return {
            intro: {
                start: 0,
                end: 0,
            },
            outro: {
                start: 0,
                end: 0,
            },
        };
    });

    if (!skipTimes) {
        return reply.status(404).send({ error: "Not found." });
    }

    await redis.set(`skip-times:${id}`, JSON.stringify(skipTimes), "EX", cacheTime);

    return reply.json(skipTimes);
});

app.post("/skip-times", async (request, reply) => {
    const { id } = request.body as any;

    if (!id) {
        return reply.status(400).send({ error: "Invalid ID." });
    }

    const cached = await redis.get(`skip-times:${id}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const skipTimes = await Database.findSkipTimes(id).catch((err) => {
        return {
            intro: {
                start: 0,
                end: 0,
            },
            outro: {
                start: 0,
                end: 0,
            },
        };
    });

    if (!skipTimes) {
        return reply.status(404).send({ error: "Not found." });
    }

    await redis.set(`skip-times:${id}`, JSON.stringify(skipTimes), "EX", cacheTime);

    return reply.json(skipTimes);
});

app.get("/pages/:id/:providerId/:readId", async (request, reply) => {
    const { id, providerId, readId } = request.params as any;

    if (!id || id.length === 0) {
        return reply.status(400).send({ error: "Invalid AniList ID." });
    }

    if (!providerId || providerId.length === 0) {
        return reply.status(400).send({ error: "Invalid provider ID." });
    }

    if (!readId || readId.length === 0) {
        return reply.status(400).send({ error: "Invalid read ID." });
    }

    const cached = await redis.get(`pages:${id}:${providerId}:${readId}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const existing = await fetchPages(id, providerId, readId);
    if (existing) {
        await redis.set(`pages:${id}:${providerId}:${readId}`, JSON.stringify(existing), "EX", cacheTime);

        return reply.json(existing);
    }
    return reply.status(404).send({ error: "Not found" });
});

app.get("/pages", async (request, reply) => {
    const { id, providerId, readId } = request.query as any;

    if (!id || id.length === 0) {
        return reply.status(400).send({ error: "Invalid AniList ID." });
    }

    if (!providerId || providerId.length === 0) {
        return reply.status(400).send({ error: "Invalid provider ID." });
    }

    if (!readId || readId.length === 0) {
        return reply.status(400).send({ error: "Invalid read ID." });
    }

    const cached = await redis.get(`pages:${id}:${providerId}:${readId}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const existing = await fetchPages(id, providerId, readId);
    if (existing) {
        await redis.set(`pages:${id}:${providerId}:${readId}`, JSON.stringify(existing), "EX", cacheTime);

        return reply.json(existing);
    }
    return reply.status(404).send({ error: "Not found" });
});

app.post("/pages", async (request, reply) => {
    const { id, providerId, readId } = request.body as any;

    if (!id || id.length === 0) {
        return reply.status(400).send({ error: "Invalid AniList ID." });
    }

    if (!providerId || providerId.length === 0) {
        return reply.status(400).send({ error: "Invalid provider ID." });
    }

    if (!readId || readId.length === 0) {
        return reply.status(400).send({ error: "Invalid read ID." });
    }

    const cached = await redis.get(`pages:${id}:${providerId}:${readId}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const existing = await fetchPages(id, providerId, readId);
    if (existing) {
        await redis.set(`pages:${id}:${providerId}:${readId}`, JSON.stringify(existing), "EX", cacheTime);

        return reply.json(existing);
    }
    return reply.status(404).send({ error: "Not found" });
});

app.get("/pages-download", async (request, reply) => {
    const { id } = request.query as any;

    if (!id || id.length === 0) {
        return reply.status(400).send({ error: "Invalid MixDrop ID." });
    }

    const cached = await redis.get(`pages-download:${id}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const data = await (await fetch(`https://api.mixdrop.co/fileinfo2?email=${env.MIXDROP_EMAIL}&key=${env.MIXDROP_KEY}&ref[]=${id}`)).json();

    await redis.set(`pages-download:${id}`, JSON.stringify(data), "EX", cacheTime);

    return reply.json(data);
});

app.post("/pages-download", async (request, reply) => {
    const { id } = request.body as any;

    if (!id || id.length === 0) {
        return reply.status(400).send({ error: "Invalid MixDrop ID." });
    }

    const cached = await redis.get(`pages-download:${id}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const data = await (await fetch(`https://api.mixdrop.co/fileinfo2?email=${env.MIXDROP_EMAIL}&key=${env.MIXDROP_KEY}&ref[]=${id}`)).json();

    await redis.set(`pages-download:${id}`, JSON.stringify(data), "EX", cacheTime);

    return reply.json(data);
});

app.get("/episode-covers/:id", async (request, reply) => {
    const { id } = request.params as any;

    if (!id || id.length === 0) {
        return reply.status(400).send({ error: "Invalid AniList ID." });
    }

    const cached = await redis.get(`episode-covers:${id}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const anime = await Database.info(id);
    if (!anime) {
        return reply.status(404).send({ error: "Not found" });
    }

    if (anime.type === Type.ANIME) {
        let covers = await loadEpisodeCovers(anime as Anime);

        if (!covers) covers = [];

        await redis.set(`episode-covers:${id}`, JSON.stringify(covers), "EX", cacheTime);
        return reply.json(covers);
    } else {
        return reply.status(400).send({ error: "Type is not anime." });
    }
});

app.get("/episode-covers", async (request, reply) => {
    const { id } = request.query as any;

    if (!id || id.length === 0) {
        return reply.status(400).send({ error: "Invalid AniList ID." });
    }

    const cached = await redis.get(`episode-covers:${id}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const anime = await Database.info(id);
    if (!anime) {
        return reply.status(404).send({ error: "Not found" });
    }

    if (anime.type === Type.ANIME) {
        let covers = await loadEpisodeCovers(anime as Anime);

        if (!covers) covers = [];

        await redis.set(`episode-covers:${id}`, JSON.stringify(covers), "EX", cacheTime);
        return reply.json(covers);
    } else {
        return reply.status(400).send({ error: "Type is not anime." });
    }
});

app.post("/episode-covers", async (request, reply) => {
    const { id } = request.body as any;

    if (!id || id.length === 0) {
        return reply.status(400).send({ error: "Invalid AniList ID." });
    }

    const cached = await redis.get(`episode-covers:${id}`);
    if (cached) {
        return reply.json(JSON.parse(cached));
    }

    const anime = await Database.info(id);
    if (!anime) {
        return reply.status(404).send({ error: "Not found" });
    }

    if (anime.type === Type.ANIME) {
        let covers = await loadEpisodeCovers(anime as Anime);

        if (!covers) covers = [];

        await redis.set(`episode-covers:${id}`, JSON.stringify(covers), "EX", cacheTime);
        return reply.json(covers);
    } else {
        return reply.status(400).send({ error: "Type is not anime." });
    }
});

// Admin routes
app.get("/update-keys", async (request, reply) => {
    if (masterKey === request.query.apikey) {
        await updateRequests();

        return reply.json({ success: "true" });
    } else {
        return reply.status(401).json({ error: "Unauthorized" });
    }
});

app.get("/key", async (request, reply) => {
    const id = request.query.id as string;

    if (!id) return reply.status(400).json({ error: "No ID provided" });

    const data = await Database.getKeyById(id);
    if (!data) return reply.status(404).json({ error: "Key not found" });

    return reply.json(data);
});

app.get("/keys", async (request, reply) => {
    if (masterKey === request.query.apikey) {
        const data = await Database.fetchAllAPIKeys();

        return reply.json(data);
    } else {
        return reply.status(401).json({ error: "Unauthorized" });
    }
});

app.get("/assign", async (request, reply) => {
    if (masterKey === request.query.apikey) {
        const id = request.query.id as string;
        const key = request.query.key as string;

        if (!id) return reply.status(400).json({ error: "No ID provided" });
        if (!key) return reply.status(400).json({ error: "No key provided" });

        const exists = await Database.fetchAPIKey(key);
        if (!exists) return reply.status(404).json({ error: "Key not found" });

        const data = await Database.assignKey(key, id);
        if (!data) return reply.status(401).json({ error: "Key already assigned. Please unassign the key first." });

        return reply.json(data);
    } else {
        return reply.status(401).json({ error: "Unauthorized" });
    }
});

app.get("/unassign", async (request, reply) => {
    if (masterKey === request.query.apikey) {
        const key = request.query.key as string;

        if (!key) return reply.status(400).json({ error: "No key provided" });

        const exists = await Database.fetchAPIKey(key);
        if (!exists) return reply.status(404).json({ error: "Key not found" });

        const data = await Database.unassignKey(key);

        return reply.json(data);
    } else {
        return reply.status(401).json({ error: "Unauthorized" });
    }
});

app.get("/delete", async (request, reply) => {
    if (masterKey === request.query.apikey) {
        const key = request.query.key as string;

        if (!key) return reply.status(400).json({ error: "No key provided" });

        const data = await Database.deleteKey(key);

        return reply.json(data);
    } else {
        return reply.status(401).json({ error: "Unauthorized" });
    }
});

export const start = async () => {
    const masterProcess = () => Array.from(Array(numCPUs)).map(cluster.fork);
    const childProcess = () =>
        app.listen(
            { port: port },
            void ((err, address) => {
                if (err) {
                    process.exit(1);
                }
            })
        );

    if (cluster.isPrimary) {
        console.log(colors.blue(`Server is now listening on ${port}`));
        masterProcess();
        await importKeys();
        await createLoop();
    } else childProcess();
    cluster.on("exit", (worker) => cluster.fork());
};