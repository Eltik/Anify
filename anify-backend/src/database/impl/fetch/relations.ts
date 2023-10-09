import { db } from "../..";
import { Type } from "../../../types/enums";
import { Anime, Db, Manga } from "../../../types/types";
import { get } from "./get";

export const relations = async (id: string): Promise<Anime[] | Manga[] | undefined> => {
    const data = await get(id);
    if (!data) return undefined;

    const relations: Anime[] | Manga[] = [];

    const anime = await (
        await db.query<Db<Anime>, {}>("SELECT * FROM anime").all({})
    )
        .map((data) => {
            try {
                let parsedAnime = Object.assign(data, {
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

                return parsedAnime as unknown as Anime;
            } catch (e) {
                return undefined;
            }
        })
        .filter((data) => data !== undefined);
    const manga = await db
        .query<Db<Manga>, {}>("SELECT * FROM manga")
        .all({})
        .map((data) => {
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
        })
        .filter((data) => data !== undefined);

    for (const relation of data.relations) {
        const possible = relation.type === Type.ANIME ? anime.find((data) => data?.mappings.find((mapping) => mapping.providerId === "anilist" && mapping.id === relation.id)) : manga.find((data) => data?.mappings.find((mapping) => mapping.providerId === "anilist" && mapping.id === relation.id));
        if (possible) {
            Object.assign(possible, { relationType: relation.type });
            relations.push(possible as any);
        }
        /*
        const possible = await db.query<Db<Anime | Manga>, { $id: string }>(`SELECT * FROM ${data.type} WHERE id = ?`).get({ $id: String(relation.id) });
        if (possible) {
            Object.assign(possible, { relationType: relation.type });
            relations.push(possible as any);
        }
        */
    }

    return relations;
};
