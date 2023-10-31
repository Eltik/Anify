import { QueryConfig } from "pg";
import { sqlite, dbType, postgres } from "../..";
import { SkipTime } from "../../../types/types";

export const getSkipTimes = async (id: string): Promise<SkipTime | undefined> => {
    if (dbType === "postgresql") {
        const query: QueryConfig = {
            text: `
                SELECT * FROM "skipTimes"
                WHERE id = $1
            `,
            values: [id],
        };

        const data = await postgres.query(query);
        return data.rows[0];
    }

    const data = (await sqlite.query(`SELECT * FROM skipTimes WHERE id = $id`).get({ $id: id })) as SkipTime | undefined;
    if (!data) return undefined;

    Object.assign(data, {
        episodes: JSON.parse((data as any).episodes),
    });

    return data;
};
