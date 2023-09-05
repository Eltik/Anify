import dotenv from "dotenv";
dotenv.config();

import queues from "./worker";
import emitter, { Events } from "./helper/event";
import { start } from "./server";
import Database from "./database";
import { MediaStatus } from "./mapping";
import { fetchCorsProxies } from "./helper/proxies";

emitter.on(Events.COMPLETED_SEASONAL_LOAD, async (data) => {
    for (let i = 0; i < data.trending.length; i++) {
        if (data.trending[i].status === MediaStatus.NOT_YET_RELEASED) {
            continue;
        }
        const existing = await Database.info(String(data.trending[i].aniListId));
        if (!existing) {
            queues.mappingQueue.add({ id: data.trending[i].aniListId, type: data.trending[i].type });
        }
    }

    for (let i = 0; i < data.popular.length; i++) {
        if (data.popular[i].status === MediaStatus.NOT_YET_RELEASED) {
            continue;
        }
        const existing = await Database.info(String(data.popular[i].aniListId));
        if (!existing) queues.mappingQueue.add({ id: data.popular[i].aniListId, type: data.popular[i].type });
    }

    for (let i = 0; i < data.top.length; i++) {
        if (data.top[i].status === MediaStatus.NOT_YET_RELEASED) {
            continue;
        }
        const existing = await Database.info(String(data.top[i].aniListId));
        if (!existing) queues.mappingQueue.add({ id: data.top[i].aniListId, type: data.top[i].type });
    }

    for (let i = 0; i < data.seasonal.length; i++) {
        if (data.seasonal[i].status === MediaStatus.NOT_YET_RELEASED) {
            continue;
        }
        const existing = await Database.info(String(data.seasonal[i].aniListId));
        if (!existing) queues.mappingQueue.add({ id: data.seasonal[i].aniListId, type: data.seasonal[i].type });
    }
});

emitter.on(Events.COMPLETED_MAPPING_LOAD, async (data) => {
    for (let i = 0; i < data.length; i++) {
        if (await Database.info(String(data[i].aniListId))) {
            continue;
        }
        queues.createEntry.add({ toInsert: data[i], type: data[i].type });
    }
});

emitter.on(Events.COMPLETED_SEARCH_LOAD, (data) => {
    if (data[0]?.aniListId) {
        for (let i = 0; i < data.length; i++) {
            if (data[i].status === MediaStatus.NOT_YET_RELEASED) {
                continue;
            }
            queues.mappingQueue.add({ id: data[i].aniListId, type: data[i].type });
        }
    }
});

// Todo: For inserting all skip times, merge the episodescrape repo so that it adds a bunch of events lol
emitter.on(Events.COMPLETED_SKIPTIMES_LOAD, (data) => {
    // Do something
});

emitter.on(Events.COMPLETED_PAGE_UPLOAD, (data) => {
    // Do something
});

queues.seasonQueue.start();
queues.mappingQueue.start();
queues.createEntry.start();
queues.searchQueue.start();
queues.skipTimes.start();
queues.uploadPages.start();

fetchCorsProxies().then(async () => {
    await Database.initializeDatabase();
    await start();
});
