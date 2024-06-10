import { QueryConfig } from "pg";
import { sqlite, dbType, postgres } from "../..";
import { Anime, Db, Manga } from "../../../types/types";

export const media = async (providerId: string, id: string, fields: string[] = []): Promise<Anime | Manga | undefined> => {
    if (dbType === "postgresql") {
        const query: QueryConfig = {
            text: `
                SELECT * FROM "anime"
                WHERE "anime"."mappings" @> '[{"providerId": "${providerId}", "id": "${id}"}]'
            `,
        };

        const data: Anime | undefined = await postgres.query<Anime>(query).then((res) => res.rows[0]);

        if (!data) {
            const query: QueryConfig = {
                text: `
                    SELECT * FROM "manga"
                    WHERE "manga"."mappings" @> '[{"providerId": "${providerId}", "id": "${id}"}]'
                `,
            };

            const data: Manga | undefined = await postgres.query<Manga>(query).then((res) => res.rows[0]);
            return data;
        } else {
            return data as Anime | Manga;
        }
    }

    const sql = `
        SELECT * FROM anime
        WHERE (
            SELECT COUNT(*)
            FROM json_each(anime.mappings) AS mapping
            WHERE
                json_extract(mapping.value, '$.providerId') = $providerId
                AND json_extract(mapping.value, '$.id') = $id
        ) > 0
    `;
    const results = await Promise.resolve(
        sqlite
            .query<
                Db<Anime>,
                {
                    $providerId: string;
                    $id: string;
                }
            >(sql)
            .all({
                $providerId: providerId,
                $id: id,
            }),
    );

    if (results.length === 0) {
        const sql = `
            SELECT * FROM manga
            WHERE (
                SELECT COUNT(*)
                FROM json_each(manga.mappings) AS mapping
                WHERE
                    json_extract(mapping.value, '$.providerId') = $providerId
                    AND json_extract(mapping.value, '$.id') = $id
            ) > 0
        `;
        const results = await Promise.resolve(
            sqlite
                .query<
                    Db<Manga>,
                    {
                        $providerId: string;
                        $id: string;
                    }
                >(sql)
                .all({
                    $providerId: providerId,
                    $id: id,
                }),
        );
        const data = results[0];

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
    }

    const data = results[0];

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
};
