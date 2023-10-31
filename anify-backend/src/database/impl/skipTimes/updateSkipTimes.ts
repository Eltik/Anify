import { db, dbType } from "../..";
import { SkipTime } from "../../../types/types";
import { createSkipTimes } from "./createSkipTimes";
import { getSkipTimes } from "./getSkipTimes";

export const updateSkipTimes = async (data: SkipTime) => {
    if (!(await getSkipTimes(data.id))) return await createSkipTimes(data);

    if (dbType === "postgresql") {
        const query = `
            UPDATE "skipTimes" SET
                episodes = $episodes
            WHERE id = $id
        `;
    }

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
