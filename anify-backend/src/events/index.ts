import pLimit from "p-limit";
import EventEmitter2 from "eventemitter2";
import { Events } from "../types/impl/events";
import colors from "colors";
import type { IMedia, ISeasonal } from "../types/impl/mappings";
import { MediaRepository } from "../database/impl/wrapper/impl/media";
import { db } from "../database";
import queues from "../worker";
import type { MediaFormat, MediaType } from "../types";
import type { IEpisodeData } from "../types/impl/database/impl/mappings";
import { AnimeRepository } from "../database/impl/wrapper/impl/anime";

export const limit = pLimit(4);

export const emitter = new EventEmitter2({
    wildcard: true,
    newListener: false,
    removeListener: false,
    maxListeners: 20,
});

emitter.on(Events.PROXIES_LOADED, () => {
    return limit(() => console.log(colors.green("Proxies loaded")));
});

emitter.on(Events.PROXIES_SAVED, () => {
    return limit(() => console.log(colors.green("Proxies saved")));
});

emitter.on(Events.DATABASE_CONNECTED, () => {
    return limit(() => console.log(colors.green("Database connected")));
});

emitter.on(Events.DATABASE_DISCONNECTED, () => {
    return limit(() => console.log(colors.red("Database disconnected")));
});

emitter.on(Events.DATABASE_SCHEMA_SYNCED, () => {
    return limit(() => console.log(colors.green("Database schema synced")));
});

emitter.on(Events.DATABASE_TABLE_CREATED, (table: string) => {
    return limit(() => console.log(colors.gray("Table created: ") + colors.cyan(table)));
});

emitter.on(Events.DATABASE_TABLE_ALTERED, (table: string, col: string, type: string) => {
    return limit(() => console.log(colors.gray("Table altered: ") + colors.cyan(table) + colors.gray(" - ") + colors.cyan(col) + colors.gray(" - ") + colors.cyan(type)));
});

emitter.on(Events.DATABASE_MAPPINGS_INSERTED, (data: IMedia[]) => {
    return limit(() => console.log(colors.green("Mappings inserted: ") + colors.cyan(data.map((x) => x.id).join(", "))));
});

emitter.on(Events.COMPLETED_MAPPING_LOAD, (data: IMedia[]) => {
    return limit(async () => {
        await MediaRepository.batchInsert(
            db,
            data
                .map((x) => ({
                    data: x,
                    type: x.type,
                }))
                .filter((x) => x.data !== null),
        );
    });
});

emitter.on(
    Events.COMPLETED_SEASONAL_LOAD,
    (
        data:
            | {
                  trending: ISeasonal[];
                  seasonal: ISeasonal[];
                  popular: ISeasonal[];
                  top: ISeasonal[];
              }
            | null
            | undefined,
    ) => {
        return limit(async () => {
            const itemsToFetch: Array<{ type: MediaType; id: string; formats: [MediaFormat] }> = [];

            for (const x of data?.trending ?? []) {
                itemsToFetch.push({
                    type: x.type,
                    id: x.id,
                    formats: [x.format],
                });
            }
            for (const x of data?.seasonal ?? []) {
                itemsToFetch.push({
                    type: x.type,
                    id: x.id,
                    formats: [x.format],
                });
            }
            for (const x of data?.popular ?? []) {
                itemsToFetch.push({
                    type: x.type,
                    id: x.id,
                    formats: [x.format],
                });
            }
            for (const x of data?.top ?? []) {
                itemsToFetch.push({
                    type: x.type,
                    id: x.id,
                    formats: [x.format],
                });
            }
            // Remove duplicates
            const uniqueItems = itemsToFetch.filter((item, index, self) => index === self.findIndex((t) => t.id === item.id));

            const batchFetch = await MediaRepository.batchFetchWithFilter(db, uniqueItems);

            const toInsert = uniqueItems.filter((x) => !batchFetch.find((y) => x.id === y.id));

            for (const media of toInsert) {
                queues.mappingQueue.add({
                    id: media.id,
                    type: media.type,
                    formats: media.formats,
                });
            }
        });
    },
);

emitter.on(
    Events.COMPLETED_EPISODES_LOAD,
    (data: {
        id: string;
        newData: {
            currentEpisode: number | null | undefined;
            totalEpisodes: number | null | undefined;
            episodes:
                | {
                      latest: {
                          updatedAt: number;
                          latestEpisode: number;
                          latestTitle: string;
                      };
                      data: IEpisodeData[];
                  }
                | undefined;
        };
    }) => {
        return limit(async () => {
            try {
                await AnimeRepository.updatePartially(db, data.id, data.newData);
                console.log(colors.gray("Successfully fetched episodes for media ") + colors.cyan(data.id) + colors.gray("."));
            } catch (e) {
                console.error(e);
                console.error(colors.red(`Error updating media ${data.id} with data:`), data.newData);
            }
        });
    },
);
