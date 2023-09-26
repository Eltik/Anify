import { db } from "../..";
import { Anime, Db, Manga } from "../../../types/types";

export const get = async (id: string): Promise<Anime | Manga | undefined> => {
    const anime = db.query<Db<Anime>, { $id: string }>(`SELECT * FROM anime WHERE id = $id`).get({ $id: id });
    if (!anime) {
        const data = db.query<Db<Manga>, { $id: string }>(`SELECT * FROM manga WHERE id = $id`).get({ $id: id });
        if (!data) return undefined;

        try {
            let parsedManga = Object.assign(data, {
                title: JSON.parse(data.title),
                mappings: JSON.parse(data.mappings),
                synonyms: JSON.parse(data.synonyms),
                rating: JSON.parse(data.rating),
                popularity: JSON.parse(data.popularity),
                relations: JSON.parse(data.relations),
                genres: JSON.parse(data.genres),
                tags: JSON.parse(data.tags),
                chapters: JSON.parse(data.chapters),
                artwork: JSON.parse(data.artwork),
                characters: JSON.parse(data.characters),
            });

            return parsedManga as unknown as Manga;
        } catch (e) {
            return undefined;
        }
    } else {
        try {
            let parsedAnime = Object.assign(anime, {
                title: JSON.parse(anime.title),
                season: anime.season.replace(/"/g, ""),
                mappings: JSON.parse(anime.mappings),
                synonyms: JSON.parse(anime.synonyms),
                rating: JSON.parse(anime.rating),
                popularity: JSON.parse(anime.popularity),
                relations: JSON.parse(anime.relations),
                genres: JSON.parse(anime.genres),
                tags: JSON.parse(anime.tags),
                episodes: JSON.parse(anime.episodes),
                artwork: JSON.parse(anime.artwork),
                characters: JSON.parse(anime.characters),
            });
            
            return parsedAnime as unknown as Anime;
        } catch (e) {
            return undefined;
        }
    }
};
