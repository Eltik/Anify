import { sqlite, dbType, postgres } from "../..";
import { Type } from "../../../types/enums";
import { Anime, Db, Manga } from "../../../types/types";
import { get } from "./get";

export const relations = async (id: string, fields: string[] = []): Promise<Anime[] | Manga[] | undefined> => {
    const data = await get(id);
    if (!data) return undefined;

    const relations: Anime[] | Manga[] = [];

    if (dbType === "postgresql") {
        for (const relation of data.relations) {
            let results: Anime[] | Manga[] = [];
            if (relation.type === Type.ANIME) {
                const where = `
                    WHERE (
                        "anime".mappings @> '[{"providerId": "anilist"}]'
                    )
                    AND (
                        "anime".mappings @> '[{"id": "${relation.id}"}]'
                    )
                `;

                results = await postgres
                    .query<Anime>(
                        `
                    SELECT * FROM "anime"
                    ${where}
                `,
                    )
                    .then((res) => res.rows);
            } else {
                const where = `
                    WHERE (
                        "manga".mappings @> '[{"providerId": "anilist"}]'
                    )
                    AND (
                        "manga".mappings @> '[{"id": "${relation.id}"}]'
                    )
                `;

                results = await postgres
                    .query<Manga>(
                        `
                    SELECT * FROM "manga"
                    ${where}
                `,
                    )
                    .then((res) => res.rows);
            }

            results
                .map((data) => {
                    try {
                        Object.assign(data, {
                            relationType: relation.relationType,
                        });
                        if (fields && fields.length > 0) {
                            // Delete fields that don't exist in the fields array
                            Object.keys(data).forEach((key) => {
                                if (!fields.includes(key)) {
                                    delete (data as { [key: string]: any })[key];
                                }
                            });
                        }
                    } catch (e) {
                        return undefined;
                    }

                    return data;
                })
                .filter((data) => data !== undefined)
                .forEach((data) => relations.push(data as any));
        }

        return relations;
    }

    for (const relation of data.relations) {
        const results = await sqlite
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

                        if (fields && fields.length > 0) {
                            // Delete fields that don't exist in the fields array
                            Object.keys(data).forEach((key) => {
                                if (!fields.includes(key)) {
                                    delete (data as { [key: string]: any })[key];
                                }
                            });
                        }

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

                        if (fields && fields.length > 0) {
                            // Delete fields that don't exist in the fields array
                            Object.keys(data).forEach((key) => {
                                if (!fields.includes(key)) {
                                    delete (data as { [key: string]: any })[key];
                                }
                            });
                        }

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
