import { db, dbType } from "../..";
import { SkipTime } from "../../../types/types";
import { getSkipTimes } from "./getSkipTimes";

export const createSkipTimes = async (data: SkipTime, stringify: boolean = true) => {
    if (await getSkipTimes(data.id)) return null;
    if (dbType === "postgresql") {
        const query = `
            INSERT INTO "skipTimes" (
                id,
                episodes
            ) VALUES (
                $id,
                $episodes
            )
        `;
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

    const insert = await db.prepare(query).run(params as any);
    return insert;
};
