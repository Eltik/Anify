import { QueryConfig } from "pg";
import { sqlite, dbType, postgres } from "../..";
import { SkipTime } from "../../../types/types";
import { createSkipTimes } from "./createSkipTimes";
import { getSkipTimes } from "./getSkipTimes";
import { isString } from "../../../helper";

export const updateSkipTimes = async (data: SkipTime) => {
    if (!(await getSkipTimes(data.id))) return await createSkipTimes(data);

    if (dbType === "postgresql") {
        if (isString((data as any).episodes)) {
            Object.assign(data, {
                episodes: JSON.parse((data as any).episodes),
            });
        }

        const query: QueryConfig = {
            text: `
                UPDATE "skipTimes" SET
                    episodes = $1
                WHERE id = $2
            `,
            values: [data.episodes, data.id],
        };

        const update = await postgres.query(query);
        return update;
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

    const update = await sqlite.prepare(query).run(params);
    return update;
};
