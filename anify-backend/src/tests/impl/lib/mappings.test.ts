import { expect, test } from "bun:test";
import { db, init as initDB } from "../../../database";
import lib from "../../../lib";
import { MediaFormat, MediaType } from "../../../types";
import { env } from "../../../env";
import { MediaRepository } from "../../../database/impl/wrapper/impl/media";
import { preloadProxies } from "../../../proxies/impl/manager/impl/file/preloadProxies";

test(
    "MappingsHandler",
    async (done) => {
        await initDB();
        await preloadProxies();

        const animeId = "113415"; // Mushoku Tensei
        const animeFormats = [MediaFormat.TV];
        const mangaId = "bd6d0982-0091-4945-ad70-c028ed3c0917"; // Mushoku Tensei
        const mangaFormats = [MediaFormat.MANGA];

        await MediaRepository.deleteById(db, MediaType.ANIME, animeId);
        await MediaRepository.deleteById(db, MediaType.MANGA, mangaId);

        const animeMappings = await lib.loadMapping({
            id: animeId,
            type: MediaType.ANIME,
            formats: animeFormats,
        });

        const mangaMappings = await lib.loadMapping({
            id: mangaId,
            type: MediaType.MANGA,
            formats: mangaFormats,
        });

        if (env.DEBUG) {
            console.log(animeMappings[0]);
            console.log(mangaMappings[0]);
        }

        expect(animeMappings).not.toBeEmpty();
        expect(mangaMappings).not.toBeEmpty();

        done();
    },
    {
        timeout: 100000,
    },
);
