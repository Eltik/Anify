import { db, dbType } from "../..";
import { Anime, Db, Manga } from "../../../types/types";

export const get = async (id: string, fields: string[] = []): Promise<Anime | Manga | undefined> => {
    if (dbType === "postgresql") {
        const data: Anime | Manga | undefined = undefined;
        if (!data) return undefined;

        try {
            if (fields && fields.length > 0) {
                // Delete fields that don't exist in the fields array
                Object.keys(data).forEach((key) => {
                    if (!fields.includes(key)) {
                        delete (data as { [key: string]: any })[key];
                    }
                });
            }

            return data as unknown as Anime | Manga;
        } catch (e) {
            return undefined;
        }
    }

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

            if (fields && fields.length > 0) {
                // Delete fields that don't exist in the fields array
                Object.keys(parsedManga).forEach((key) => {
                    if (!fields.includes(key)) {
                        delete (parsedManga as { [key: string]: any })[key];
                    }
                });
            }

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

            if (fields && fields.length > 0) {
                // Delete fields that don't exist in the fields array
                Object.keys(parsedAnime).forEach((key) => {
                    if (!fields.includes(key)) {
                        delete (parsedAnime as { [key: string]: any })[key];
                    }
                });
            }

            return parsedAnime as unknown as Anime;
        } catch (e) {
            return undefined;
        }
    }
};
