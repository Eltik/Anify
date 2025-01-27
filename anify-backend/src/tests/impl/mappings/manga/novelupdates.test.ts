import { expect, test } from "bun:test";
import { env } from "../../../../env";
import { preloadProxies } from "../../../../proxies/impl/manager/impl/file/preloadProxies";
import NovelUpdates from "../../../../mappings/impl/manga/impl/novelupdates";

const novelupdates = new NovelUpdates();

test(
    "Manga.NovelUpdates.Search",
    async (done) => {
        if (env.IS_WORKFLOW) {
            done();
            return;
        }

        await preloadProxies();
        const data = await novelupdates.search("Mushoku Tensei");

        expect(data).toBeDefined();
        expect(data).not.toBeEmpty();

        if (env.DEBUG) {
            console.log(data);
        }

        done();
    },
    {
        timeout: 20000,
    },
);

test(
    "Manga.NovelUpdates.Chapters",
    async (done) => {
        if (env.IS_WORKFLOW) {
            done();
            return;
        }

        await preloadProxies();
        const resp = await novelupdates.search("Mushoku Tensei");
        const data = await novelupdates.fetchChapters(resp?.[0].id ?? "");

        expect(data).toBeDefined();
        expect(data).not.toBeEmpty();

        if (env.DEBUG) {
            console.log(data);
        }

        done();
    },
    {
        timeout: 20000,
    },
);

test(
    "Manga.NovelUpdates.Pages",
    async (done) => {
        if (env.IS_WORKFLOW) {
            done();
            return;
        }

        await preloadProxies();
        const resp = await novelupdates.search("Mushoku Tensei");
        const data1 = await novelupdates.fetchChapters(resp?.[0].id ?? "");
        const data = await novelupdates.fetchPages(data1?.[3].id ?? "");

        expect(data).toBeDefined();
        expect(data).not.toBeEmpty();

        if (env.DEBUG) {
            console.log(data);
        }

        done();
    },
    {
        timeout: 20000,
    },
);
