import { db } from "../..";
import { SkipTime } from "../../../types/types";
import { createSkipTimes } from "./createSkipTimes";
import { getSkipTimes } from "./getSkipTimes";

export const updateSkipTimes = async (data: SkipTime) => {
    if (!(await getSkipTimes(data.id))) return await createSkipTimes(data);

    const query = `
    UPDATE skipTimes SET
        episodes = $episodes
    WHERE id = $id
    `;

    const params = {
        $id: data.id,
        $episodes: JSON.stringify(data.episodes),
    };

    const update = await db.prepare(query).run(params);
    return update;
};
