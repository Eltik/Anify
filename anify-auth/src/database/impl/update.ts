import { db } from "..";
import { IDs } from "../../types";

export const updateUser = async (id: string, ids: IDs) => {
    const query = `
        UPDATE User
        SET anilistId = $anilistId, malId = $malId, simklId = $simklId
        WHERE id = $id;
    `;

    return await db.query(query).run({
        $id: id,
        $anilistId: ids.anilistId ?? "",
        $malId: ids.malId ?? "",
        $simklId: ids.simklId ?? "",
    });
};
