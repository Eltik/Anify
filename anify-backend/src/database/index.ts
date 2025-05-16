import { env } from "../env";
import DatabaseHandler from "./impl/handler";
import SchemaBuilder from "./impl/schema";
import animeSchema from "./impl/schema/impl/anime";
import apiKeySchema from "./impl/schema/impl/apiKey";
import mangaSchema from "./impl/schema/impl/manga";
import skipTimesSchema from "./impl/schema/impl/skipTimes";
import { AnimeRepository } from "./impl/wrapper/impl/anime";
import { ApiKeyRepository } from "./impl/wrapper/impl/apiKey";
import { MangaRepository } from "./impl/wrapper/impl/manga";
import { SkipTimesRepository } from "./impl/wrapper/impl/skipTimes";

export const schemaBuilder = new SchemaBuilder().defineTable(AnimeRepository.tableName, animeSchema).defineTable(ApiKeyRepository.tableName, apiKeySchema).defineTable(MangaRepository.tableName, mangaSchema).defineTable(SkipTimesRepository.tableName, skipTimesSchema);

export const db = new DatabaseHandler(
    {
        user: env.DATABASE_URL.split(":")[1].split("/")[2],
        host: env.DATABASE_URL.split("@")[1].split(":")[0],
        database: env.DATABASE_URL.split("/")[3],
        password: env.DATABASE_URL.split(":")[2].split("@")[0],
        port: parseInt(env.DATABASE_URL.split(":")[3].split("/")[0]),
    },
    schemaBuilder.getSchemas(),
);

export const init = async () => {
    await db.connect();

    // NOTE: If I get issues, just do psql postgres and then run DROP TABLE "anify.anime"; DROP TABLE "anify.manga"; DROP TABLE "anify.skip_times";
    await db.syncSchema();
};
