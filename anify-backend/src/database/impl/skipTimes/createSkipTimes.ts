import { db } from "../..";
import { SkipTime } from "../../../types/types";
import { getSkipTimes } from "./getSkipTimes";

export const createSkipTimes = async (data: SkipTime) => {
    if (await getSkipTimes(data.id)) return null;

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
        $episodes: JSON.stringify(data.episodes),
    };

    const insert = await db.prepare(query).run(params);
    return insert;
};
