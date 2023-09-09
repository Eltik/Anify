import { db } from "../..";
import { Anime, Manga } from "../../../types/types";

export const get = async (id: string): Promise<Anime | Manga | undefined> => {
    const anime = await db.query(`SELECT * FROM anime WHERE id = $id`).get({ $id: id });
    if (!anime) {
        const data = (await db.query(`SELECT * FROM manga WHERE id = $id`).get({ $id: id })) as Manga | undefined;
        if (!data) return undefined;

        try {
            Object.assign(data, {
                title: JSON.parse((data as any).title),
                mappings: JSON.parse((data as any).mappings),
                synonyms: JSON.parse((data as any).synonyms),
                rating: JSON.parse((data as any).rating),
                popularity: JSON.parse((data as any).popularity),
                relations: JSON.parse((data as any).relations),
                genres: JSON.parse((data as any).genres),
                tags: JSON.parse((data as any).tags),
                chapters: JSON.parse((data as any).chapters),
                artwork: JSON.parse((data as any).artwork),
                characters: JSON.parse((data as any).characters),
            });

            return data as Manga;
        } catch (e) {
            return undefined;
        }
    } else {
        try {
            Object.assign(anime, {
                title: JSON.parse((anime as any).title),
                season: (anime as any).season.replace(/"/g, ""),
                mappings: JSON.parse((anime as any).mappings),
                synonyms: JSON.parse((anime as any).synonyms),
                rating: JSON.parse((anime as any).rating),
                popularity: JSON.parse((anime as any).popularity),
                relations: JSON.parse((anime as any).relations),
                genres: JSON.parse((anime as any).genres),
                tags: JSON.parse((anime as any).tags),
                episodes: JSON.parse((anime as any).episodes),
                artwork: JSON.parse((anime as any).artwork),
                characters: JSON.parse((anime as any).characters),
            });
            return anime as Anime;
        } catch (e) {
            return undefined;
        }
    }
};
