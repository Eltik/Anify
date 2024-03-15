import { QueryConfig } from "pg";
import { sqlite, dbType, postgres } from "../..";
import { Anime, Db, Manga } from "../../../types/types";

export const get = async (id: string, fields: string[] = []): Promise<Anime | Manga | undefined> => {
    if (dbType === "postgresql") {
        const query: QueryConfig = {
            text: `
                SELECT * FROM anime WHERE id = $1
            `,
            values: [id],
        };
        const data: Anime | undefined = await postgres.query<Anime>(query).then((res) => res.rows[0]);
        if (!data) {
            const query: QueryConfig = {
                text: `
                    SELECT * FROM manga WHERE id = $1
                `,
                values: [id],
            };
            const data: Manga | undefined = await postgres.query<Manga>(query).then((res) => res.rows[0]);
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
        } else {
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
    }

    const data = sqlite.query<Db<Anime>, { $id: string }>(`SELECT * FROM anime WHERE id = $id`).get({ $id: id });
    if (!data) {
        const data = sqlite.query<Db<Manga>, { $id: string }>(`SELECT * FROM manga WHERE id = $id`).get({ $id: id });
        if (!data) return undefined;

        try {
            const parsedManga = Object.assign(data, {
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
            const parsedAnime = Object.assign(data, {
                title: JSON.parse(data.title),
                season: data.season.replace(/"/g, ""),
                mappings: JSON.parse(data.mappings),
                synonyms: JSON.parse(data.synonyms),
                rating: JSON.parse(data.rating),
                popularity: JSON.parse(data.popularity),
                relations: JSON.parse(data.relations),
                genres: JSON.parse(data.genres),
                tags: JSON.parse(data.tags),
                episodes: JSON.parse(data.episodes),
                artwork: JSON.parse(data.artwork),
                characters: JSON.parse(data.characters),
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
