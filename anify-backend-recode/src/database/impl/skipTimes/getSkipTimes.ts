import { db } from "../..";
import { SkipTime } from "../../../types/types";

export const getSkipTimes = async (id: string): Promise<SkipTime | undefined> => {
    return (await db.query(`SELECT * FROM skipTimes WHERE id = $id`).get({ $id: id })) as SkipTime | undefined;
};
