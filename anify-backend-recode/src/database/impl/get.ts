import { db } from "..";
import { Anime, Manga } from "../../types/types";

export const get = async (id: string): Promise<Anime | Manga | undefined> => {
    const anime = await db.query(`SELECT * FROM anime WHERE $id`).get({ id: id });
    if (!anime) {
        return (await db.query(`SELECT * FROM manga WHERE $id`).get({ id: id })) as Manga | undefined;
    } else {
        return anime as Anime;
    }
};
