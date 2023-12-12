import dotenv from "dotenv";
dotenv.config();

import { sqlite, init, dbType, postgres } from "../database";
import { BASE_PROVIDERS } from "../mappings";
import { Format, Type } from "../types/enums";
import { Anime, Manga } from "../types/types";

import colors from "colors";
import { loadMapping } from "../lib/impl/mappings";
import queues from "../worker";
import { fetchCorsProxies } from "../proxies/impl/fetchProxies";
import emitter, { Events } from "../lib";
import { get } from "../database/impl/fetch/get";
import { wait } from "../helper";

export const crawl = async (type: Type, formats: Format[]): Promise<void> => {
    console.log(colors.green(`Crawling ${type.toLowerCase()}s with formats ${formats.join(", ")}...`));
    await before();

    const provider = BASE_PROVIDERS.map((provider) => {
        if (provider.formats?.includes(formats[0])) {
            return provider;
        } else {
            return null;
        }
    }).filter((x) => x !== null)[0];

    if (!provider) return;

    const ids = (await provider.fetchIds(formats)) ?? [];

    const formatParams = formats.map((f) => `'${f}'`).join(", ");

    const idsToRemove: string[] = [];
    const database = dbType === "sqlite" ? ((await sqlite.query(`SELECT id FROM ${type.toLowerCase()} WHERE "format" IN (${formatParams})`).all()) as Anime[] | Manga[]) : ((await postgres.query(`SELECT id FROM ${type.toLowerCase()} WHERE "format" IN (${formatParams})`)).rows as Anime[] | Manga[]);

    database.forEach((media) => {
        idsToRemove.push(media.id);
    });

    const numbersSet: Set<string> = new Set(idsToRemove);
    const cleanedIds: string[] = ids.filter((str) => !numbersSet.has(str));

    console.log(colors.gray("Found " + ids.length + " IDs, " + cleanedIds.length + " of which are not in the database."));

    const chunkSize = 10;

    const data: Anime[] | Manga[] = [];

    for (let i = 0; i < cleanedIds.length; i += chunkSize) {
        const now = Date.now();
        const chunk = cleanedIds.slice(i, i + chunkSize);
        const mappings: Anime[] | Manga[] = [];

        await Promise.all(
            chunk.map((id) => {
                return loadMapping({ id, formats, type }).then((mapping) => {
                    if (mapping) {
                        mappings.push(...(mapping as any));
                    }
                });
            }),
        ).catch((err) => {
            console.log(colors.red(`Error while fetching chunk ${i / chunkSize + 1}/${Math.ceil(cleanedIds.length / chunkSize)}: ${err}`));
        });

        console.log(colors.gray(`Fetched ${mappings.length} mappings.`));

        data.push(...(mappings as any));

        await wait(1000);

        console.log(colors.green(`Finished chunk ${i / chunkSize + 1}/${Math.ceil(cleanedIds.length / chunkSize)} in ${Date.now() - now}ms`));
    }

    console.log(colors.gray("Finished fetching data, now inserting into database."));
};

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

const type = process.argv.slice(2)?.toString()?.toLowerCase() ?? "anime";
crawl(
    type === "anime" ? Type.ANIME : type === "manga" ? Type.MANGA : Type.ANIME,
    type === "anime"
        ? [Format.TV, Format.TV_SHORT, Format.MOVIE, Format.OVA, Format.ONA, Format.SPECIAL, Format.MUSIC]
        : type === "manga"
        ? [Format.MANGA, Format.ONE_SHOT]
        : type === "novel"
        ? [Format.NOVEL]
        : [Format.TV, Format.TV_SHORT, Format.MOVIE, Format.OVA, Format.ONA, Format.SPECIAL, Format.MUSIC],
).then((data) => {
    // Hang infinitely
    console.log(data);
    console.log("Successfully crawled!");

    setInterval(() => {}, 1000);
});
