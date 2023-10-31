import { QueryConfig } from "pg";
import { sqlite, dbType, postgres } from "../..";
import { SkipTime } from "../../../types/types";
import { getSkipTimes } from "./getSkipTimes";
import { isString } from "../../../helper";

export const createSkipTimes = async (data: SkipTime, stringify: boolean = true) => {
    if (await getSkipTimes(data.id)) return null;
    if (dbType === "postgresql") {
        if (!stringify || isString((data as any).episodes)) {
            Object.assign(data, {
                episodes: JSON.parse((data as any).episodes),
            });
            if (isString((data as any).episodes)) {
                Object.assign(data, {
                    episodes: JSON.parse((data as any).episodes),
                });
            }
            if (isString((data as any).episodes)) {
                Object.assign(data, {
                    episodes: JSON.parse((data as any).episodes),
                });
            }
            if (isString((data as any).episodes)) {
                Object.assign(data, {
                    episodes: JSON.parse((data as any).episodes),
                });
            }
        }

        const query: QueryConfig = {
            text: `
                INSERT INTO "skipTimes" (
                    id,
                    episodes
                ) VALUES (
                    $1,
                    $2
                )
            `,
            values: [data.id, data.episodes],
        };

        const insert = await postgres.query(query);
        return insert;
    }

    const query = `
    INSERT INTO skipTimes (
        id,
        episodes
    ) VALUES (
        $id,
        $episodes
    )
    `;

    const params = {
        $id: data.id,
        $episodes: stringify ? JSON.stringify(data.episodes) : data.episodes,
    };

    const insert = await sqlite.prepare(query).run(params as any);
    return insert;
};
