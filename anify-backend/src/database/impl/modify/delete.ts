import { db, dbType } from "../..";
import { Type } from "../../../types/enums";
import { get } from "../fetch/get";

export const deleteEntry = async (id: string): Promise<void> => {
    const data = await get(id);
    if (!data) return undefined;

    if (dbType === "postgresql") {
        if (data.type === Type.ANIME) {
            const query = `
                DELETE FROM "anime"
                WHERE id = $id
            `;
        } else {
            const query = `
                DELETE FROM "manga"
                WHERE id = $id
            `;
        }
    }

    await db.query(`DELETE FROM ${data.type.toLowerCase()} WHERE id = $id`).run({ $id: id });
};
