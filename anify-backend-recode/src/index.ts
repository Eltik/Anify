import dotenv from "dotenv";
dotenv.config();

import { fetchCorsProxies } from "./proxies/impl/fetchProxies";
import { loadMapping } from "./lib/impl/mappings";
import { Type } from "./types/enums";
import { init } from "./database";
import emitter, { Events } from "./lib";
import { get } from "./database/impl/get";
import queues from "./worker";

before().then(async (_) => {
    await loadMapping({ id: "142598", type: Type.ANIME }).then(console.log);
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

    queues.mappingQueue.start();
    queues.createEntry.start();
}
