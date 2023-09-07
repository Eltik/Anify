import dotenv from "dotenv";
dotenv.config();

import { fetchCorsProxies } from "./proxies/impl/fetchProxies";
import { MediaStatus } from "./types/enums";
import { init } from "./database";
import emitter, { Events } from "./lib";
import { get } from "./database/impl/get";
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

    queues.mappingQueue.start();
    queues.createEntry.start();
    queues.searchQueue.start();
}
