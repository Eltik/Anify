import dotenv from "dotenv";
dotenv.config();

import { fetchCorsProxies } from "./proxies/impl/fetchProxies";
import { MediaStatus } from "./types/enums";
import { init } from "./database";
import emitter, { Events } from "./lib";
import { get } from "./database/impl/modify/get";
import queues from "./worker";
import { start } from "./server";

before().then(async (_) => {
    await start();
});

async function before() {
    await fetchCorsProxies();
    await init();

    emitter.on(Events.COMPLETED_MAPPING_LOAD, async (data) => {
        for (let i = 0; i < data.length; i++) {
            if (await get(String(data[i].id))) {
                continue;
            }
            queues.createEntry.add({ toInsert: data[i], type: data[i].type });
        }
    });

    emitter.on(Events.COMPLETED_SEARCH_LOAD, (data) => {
        for (let i = 0; i < data.length; i++) {
            if (data[i].status === MediaStatus.NOT_YET_RELEASED) {
                continue;
            }
            queues.mappingQueue.add({ id: data[i].id, type: data[i].type, formats: [data[i].format] });
        }
    });

    emitter.on(Events.COMPLETED_SEASONAL_LOAD, async (data) => {
        for (let i = 0; i < data.trending.length; i++) {
            if (data.trending[i].status === MediaStatus.NOT_YET_RELEASED) {
                continue;
            }
            const existing = await get(String(data.trending[i].id));
            if (!existing) {
                queues.mappingQueue.add({ id: data.trending[i].id, type: data.trending[i].type, formats: [data.trending[i].format] });
            }
        }

        for (let i = 0; i < data.popular.length; i++) {
            if (data.popular[i].status === MediaStatus.NOT_YET_RELEASED) {
                continue;
            }
            const existing = await get(String(data.popular[i].id));
            if (!existing) queues.mappingQueue.add({ id: data.popular[i].id, type: data.popular[i].type, formats: [data.popular[i].format] });
        }

        for (let i = 0; i < data.top.length; i++) {
            if (data.top[i].status === MediaStatus.NOT_YET_RELEASED) {
                continue;
            }
            const existing = await get(String(data.top[i].id));
            if (!existing) queues.mappingQueue.add({ id: data.top[i].id, type: data.top[i].type, formats: [data.top[i].format] });
        }

        for (let i = 0; i < data.seasonal.length; i++) {
            if (data.seasonal[i].status === MediaStatus.NOT_YET_RELEASED) {
                continue;
            }
            const existing = await get(String(data.seasonal[i].id));
            if (!existing) queues.mappingQueue.add({ id: data.seasonal[i].id, type: data.seasonal[i].type, formats: [data.seasonal[i].format] });
        }
    });

    queues.mappingQueue.start();
    queues.createEntry.start();
    queues.searchQueue.start();
    queues.seasonalQueue.start();
    queues.skipTimes.start();
    queues.uploadPages.start();
}
