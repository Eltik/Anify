import { expect, test } from "bun:test";
import { db, init as initDB } from "../../../database";
import lib from "../../../lib";
import { env } from "../../../env";
import { MangaRepository } from "../../../database/impl/wrapper/impl/manga";
import { MANGA_PROVIDERS } from "../../../mappings";
import { preloadProxies } from "../../../proxies/impl/manager/impl/file/preloadProxies";

test(
    "EpubHandler",
    async (done) => {
        await initDB();
        await preloadProxies();

        const media = await MangaRepository.getById(db, "manuscript-screening-boy-and-manuscript-submitting-girl");
        if (!media) {
            console.log("Media not found");
            return done();
        }

        const mangaProviders = await Promise.all(MANGA_PROVIDERS.map((factory) => factory()));
        const provider = mangaProviders.find((p) => p.id === "novelupdates");
        if (!provider) {
            console.log("Provider not found");
            return done();
        }

        const chapters = await provider.fetchChapters(media.id);
        if (!chapters) {
            console.log("Chapters not found");
            return done();
        }

        const epub = await lib.loadEpub({
            media,
            providerId: "novelupdates",
            chapters,
        });

        if (env.DEBUG) {
            console.log(epub);
        }

        expect(epub).toBeDefined();
        expect(epub).not.toBeEmpty();

        done();
    },
    {
        timeout: 30000,
    },
);
