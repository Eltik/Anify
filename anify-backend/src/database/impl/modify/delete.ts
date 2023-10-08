import { db } from "../..";
import { Anime, Db, Manga } from "../../../types/types";

export const deleteEntry = async (id: string): Promise<void> => {
    const anime = db.query<Db<Anime>, { $id: string }>(`SELECT * FROM anime WHERE id = $id`).get({ $id: id });
    if (!anime) {
        const data = db.query<Db<Manga>, { $id: string }>(`SELECT * FROM manga WHERE id = $id`).get({ $id: id });
        if (!data) return undefined;

        try {
            db.query(`DELETE FROM manga WHERE id = $id`).run({ $id: id });
            db.query(`DELETE FROM manga_fts WHERE id = $id`).run({ $id: id });
        } catch (e) {
            return undefined;
        }
    } else {
        try {
            db.query(`DELETE FROM anime WHERE id = $id`).run({ $id: id });
            db.query(`DELETE FROM anime_fts WHERE id = $id`).run({ $id: id });
        } catch (e) {
            return undefined;
        }
    }
};
