import { db } from "../..";
import { Type } from "../../../types/enums";
import { Anime, Db, Manga } from "../../../types/types";
import { get } from "./get";

export const relations = async (id: string): Promise<Anime[] | Manga[] | undefined> => {
    const data = await get(id);
    if (!data) return undefined;

    const relations: Anime[] | Manga[] = [];

    for (const relation of data.relations) {
        const results = await db
            .query<Db<Anime | Manga>, { $id: string }>(
                `SELECT * FROM ${relation.type.toLowerCase()}
                    WHERE EXISTS (SELECT * FROM json_each(mappings) WHERE json_extract(value, '$.providerId') = 'anilist')
                    AND EXISTS (SELECT * FROM json_each(mappings) WHERE json_extract(value, '$.id') = $id)
                `,
            )
            .all({ $id: String(relation.id) });

        if (results.length === 0) continue;

        results
            .map((data) => {
                try {
                    if (data.type === Type.ANIME) {
                        Object.assign(data, {
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
                            relationType: relation.relationType,
                        });

                        return data;
                    } else {
                        Object.assign(data, {
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
                            relationType: relation.relationType,
                        });

                        return data;
                    }
                } catch (e) {
                    return undefined;
                }
            })
            .filter((data) => data !== undefined)
            .forEach((data) => relations.push(data as any));
    }

    return relations;
};
