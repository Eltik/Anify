import { expect, test } from "bun:test";
import { env } from "../../../../env";
import { MediaFormat, MediaType } from "../../../../types";
import NovelUpdatesBase from "../../../../mappings/impl/base/impl/novelupdates";
import { preloadProxies } from "../../../../proxies/impl/manager/impl/file/preloadProxies";

const novelupdates = new NovelUpdatesBase();

test(
    "Base.NovelUpdates.Search",
    async (done) => {
        if (env.IS_WORKFLOW) {
            done();
            return;
        }

        await preloadProxies();
        const data = await novelupdates.search("Mushoku Tensei", MediaType.MANGA, [MediaFormat.NOVEL], 0);

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
    "Base.NovelUpdates.GetMedia",
    async (done) => {
        if (env.IS_WORKFLOW) {
            done();
            return;
        }

        await preloadProxies();
        const data = await novelupdates.getMedia("mushoku-tensei");

        expect(data).toBeDefined();

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
    "Base.NovelUpdates.Seasonal",
    async (done) => {
        if (env.IS_WORKFLOW) {
            done();
            return;
        }

        await preloadProxies();
        const data = await novelupdates.fetchSeasonal();

        expect(data).toBeDefined();
        expect(data?.popular).not.toBeEmpty();
        expect(data?.seasonal).not.toBeEmpty();
        expect(data?.top).not.toBeEmpty();
        expect(data?.trending).not.toBeEmpty();

        if (env.DEBUG) {
            console.log(data);
        }

        done();
    },
    {
        timeout: 20000,
    },
);
