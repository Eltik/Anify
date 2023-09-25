import { db } from "../..";
import { Manga } from "../../../types/types";

export const deleteEntry = async (id: string): Promise<void> => {
    const anime = await db.query(`SELECT * FROM anime WHERE id = $id`).get({ $id: id });
    if (!anime) {
        const data = (await db.query(`SELECT * FROM manga WHERE id = $id`).get({ $id: id })) as Manga | undefined;
        if (!data) return undefined;

        try {
            await db.query(`DELETE FROM manga WHERE id = $id`).run({ $id: id });
        } catch (e) {
            return undefined;
        }
    } else {
        try {
            await db.query(`DELETE FROM anime WHERE id = $id`).run({ $id: id });
        } catch (e) {
            return undefined;
        }
    }
};
