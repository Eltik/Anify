import { db, dbType, prisma } from "../..";
import { Type } from "../../../types/enums";
import { get } from "../fetch/get";

export const deleteEntry = async (id: string): Promise<void> => {
    const data = await get(id);
    if (!data) return undefined;

    if (dbType === "postgresql") {
        if (data.type === Type.ANIME) {
            await prisma.anime.delete({
                where: {
                    id: id,
                }
            });
        } else {
            await prisma.manga.delete({
                where: { id: id },
            });
        }
    }

    await db.query(`DELETE FROM ${data.type.toLowerCase()} WHERE id = $id`).run({ $id: id });
};
