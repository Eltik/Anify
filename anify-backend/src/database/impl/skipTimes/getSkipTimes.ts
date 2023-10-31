import { db, dbType } from "../..";
import { SkipTime } from "../../../types/types";

export const getSkipTimes = async (id: string): Promise<SkipTime | undefined> => {
    if (dbType === "postgresql") {
        const query = `
            SELECT * FROM "skipTimes"
            WHERE id = $id
        `;
    }

    const data = (await db.query(`SELECT * FROM skipTimes WHERE id = $id`).get({ $id: id })) as SkipTime | undefined;
    if (!data) return undefined;

    Object.assign(data, {
        episodes: JSON.parse((data as any).episodes),
    });

    return data;
};
