import { QueryConfig } from "pg";
import { sqlite, dbType, postgres } from "../..";
import { Type } from "../../../types/enums";
import { get } from "../fetch/get";

export const deleteEntry = async (id: string): Promise<void> => {
    const data = await get(id);
    if (!data) return undefined;

    if (dbType === "postgresql") {
        if (data.type === Type.ANIME) {
            const query: QueryConfig = {
                text: `
                    DELETE FROM "anime"
                    WHERE id = $1
                `,
                values: [id],
            };

            await postgres.query(query);
            return;
        } else {
            const query: QueryConfig = {
                text: `
                    DELETE FROM "manga"
                    WHERE id = $1
                `,
                values: [id],
            };

            await postgres.query(query);
            return;
        }
    }

    await sqlite.query(`DELETE FROM ${data.type.toLowerCase()} WHERE id = $id`).run({ $id: id });
};
