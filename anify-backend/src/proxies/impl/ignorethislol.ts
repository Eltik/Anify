import dotenv from "dotenv";
dotenv.config();

import { fetchCorsProxies } from "./fetchProxies";
import { MediaStatus, StreamingServers, SubType } from "../../types/enums";
import { init } from "../../database";
import emitter, { Events } from "../../lib";
import { get } from "../../database/impl/fetch/get";
import queues from "../../worker";
import { start } from "../../server";
import { startWebsocket } from "../../websocket";
import { ANIME_PROXIES, BASE_PROXIES, MANGA_PROXIES, META_PROXIES } from "..";
import { ANIME_PROVIDERS, animeProviders } from "../../mappings";

before().then(async (_) => {
    //await start();
    //await startWebsocket();

    const file = Bun.file("9animeProxies.json");
    const json = await file.json();

    const data: { providerId: string; ip: string }[] = [];

    for (const item of json) {
        data.push({
            providerId: "9anime",
            ip: item.split("http://")[1],
        });
    }

    Bun.write("./animeProxies.json", JSON.stringify(data, null, 4));
    /*
    const file = Bun.file("9animeProxies.json");
    const json = await file.json();

    const goodProxies: string[] = [...json];

    const proxies = [...BASE_PROXIES].concat([...ANIME_PROXIES]).concat([...MANGA_PROXIES]).concat([...META_PROXIES])

    for (const proxy of proxies) {
        const ip = proxy.ip;
        if (goodProxies.includes(ip)) continue;

        const provider = animeProviders["9anime"];
        const original = provider.useGoogleTranslate;
        provider.useGoogleTranslate = false;

        provider.customProxy = ip;
        try {
            const test = await animeProviders["9anime"].search("Mushoku Tensei").catch(null);
    
            if (test) {
                console.log(ip);
                goodProxies.push(ip);
            }
        } catch (e) {
            console.log(ip + " doesnt work.")
        }

        provider.customProxy = undefined;
        provider.useGoogleTranslate = original;

        Bun.write("./9animeProxies.json", JSON.stringify(goodProxies, null, 4));
    }
    */
    //console.log("Done")

    await animeProviders["9anime"].fetchSources("Hj2bC8ou,Hj2bC8kn", SubType.SUB, StreamingServers.VizCloud).then(console.log);
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
                queues.mappingQueue.add({
                    id: data.trending[i].id,
                    type: data.trending[i].type,
                    formats: [data.trending[i].format],
                });
            }
        }

        for (let i = 0; i < data.popular.length; i++) {
            if (data.popular[i].status === MediaStatus.NOT_YET_RELEASED) {
                continue;
            }
            const existing = await get(String(data.popular[i].id));
            if (!existing)
                queues.mappingQueue.add({
                    id: data.popular[i].id,
                    type: data.popular[i].type,
                    formats: [data.popular[i].format],
                });
        }

        for (let i = 0; i < data.top.length; i++) {
            if (data.top[i].status === MediaStatus.NOT_YET_RELEASED) {
                continue;
            }
            const existing = await get(String(data.top[i].id));
            if (!existing)
                queues.mappingQueue.add({
                    id: data.top[i].id,
                    type: data.top[i].type,
                    formats: [data.top[i].format],
                });
        }

        for (let i = 0; i < data.seasonal.length; i++) {
            if (data.seasonal[i].status === MediaStatus.NOT_YET_RELEASED) {
                continue;
            }
            const existing = await get(String(data.seasonal[i].id));
            if (!existing)
                queues.mappingQueue.add({
                    id: data.seasonal[i].id,
                    type: data.seasonal[i].type,
                    formats: [data.seasonal[i].format],
                });
        }
    });

    queues.mappingQueue.start();
    queues.createEntry.start();
    queues.searchQueue.start();
    queues.seasonalQueue.start();
    queues.skipTimes.start();
    queues.uploadManga.start();
    queues.uploadNovel.start();
}
