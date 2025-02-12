import { expect, test } from "bun:test";
import { db, init as initDB } from "../../../database";
import lib from "../../../lib";
import { env } from "../../../env";
import { MangaRepository } from "../../../database/impl/wrapper/impl/manga";
import { MANGA_PROVIDERS } from "../../../mappings";
import type { IPage } from "../../../types/impl/mappings/impl/manga";
import { preloadProxies } from "../../../proxies/impl/manager/impl/file/preloadProxies";

test(
    "PDFHandler",
    async (done) => {
        await initDB();
        await preloadProxies();

        const media = await MangaRepository.getById(db, "bd6d0982-0091-4945-ad70-c028ed3c0917");
        if (!media) {
            console.log("Media not found");
            return done();
        }

        const mangaProviders = await Promise.all(MANGA_PROVIDERS.map((factory) => factory()));
        const provider = mangaProviders.find((p) => p.id === "mangadex");
        if (!provider) {
            console.log("Provider not found");
            return done();
        }

        const chapters = await provider.fetchChapters(media.id);
        if (!chapters) {
            console.log("Chapters not found");
            return done();
        }

        const pages = await provider.fetchPages(chapters[0].id);
        if (!pages) {
            console.log("Pages not found");
            return done();
        }

        const pdf = await lib.loadPDF({
            media,
            providerId: "mangadex",
            chapter: chapters[0],
            pages: pages as IPage[],
        });

        if (env.DEBUG) {
            console.log(pdf);
        }

        expect(pdf).toBeDefined();
        expect(pdf).not.toBeEmpty();

        done();
    },
    {
        timeout: 30000,
    },
);
