import { QueryConfig } from "pg";
import { sqlite, dbType, postgres } from "../..";
import { averageMetric } from "../../../helper";
import { Type } from "../../../types/enums";
import { Anime, Manga } from "../../../types/types";
import { get } from "../fetch/get";

export const create = async (data: Anime | Manga, stringify: boolean = true) => {
    if (await get(data.id)) return null;

    if (dbType == "postgresql") {
        if (!stringify) {
            try {
                Object.assign(data, {
                    title: JSON.parse((data as any).title),
                    mappings: JSON.parse((data as any).mappings),
                    synonyms: JSON.parse((data as any).synonyms),
                    rating: data.rating ? JSON.parse((data as any).rating) : null,
                    popularity: data.popularity ? JSON.parse((data as any).popularity) : null,
                    relations: data.relations ? JSON.parse((data as any).relations) : null,
                    genres: data.genres ? JSON.parse((data as any).genres) : null,
                    tags: data.tags ? JSON.parse((data as any).tags) : null,
                    artwork: data.artwork ? JSON.parse((data as any).artwork) : null,
                    characters: data.characters ? JSON.parse((data as any).characters) : null,
                });
            } catch (e) {
                //
            }
        }
        if (Number.isNaN(Number.parseInt(String(data.averagePopularity)))) data.averageRating = averageMetric(data.rating);
        if (Number.isNaN(Number.parseInt(String(data.averagePopularity)))) data.averagePopularity = averageMetric(data.popularity);

        if (data.type === Type.ANIME) {
            if (!stringify) {
                try {
                    Object.assign(data, {
                        episodes: JSON.parse((data as any).episodes),
                    });
                } catch (e) {
                    //
                }
            }

            const query: QueryConfig = {
                text: `
                    INSERT INTO anime (
                        id,
                        slug,
                        "coverImage",
                        "bannerImage",
                        trailer,
                        status,
                        season,
                        title,
                        "currentEpisode",
                        mappings,
                        synonyms,
                        "countryOfOrigin",
                        description,
                        duration,
                        color,
                        year,
                        rating,
                        popularity,
                        type,
                        format,
                        relations,
                        "totalEpisodes",
                        genres,
                        tags,
                        episodes,
                        "averageRating",
                        "averagePopularity",
                        artwork,
                        characters
                    ) VALUES (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        $7,
                        $8,
                        $9,
                        $10,
                        $11,
                        $12,
                        $13,
                        $14,
                        $15,
                        $16,
                        $17,
                        $18,
                        $19,
                        $20,
                        $21,
                        $22,
                        $23,
                        $24,
                        $25,
                        $26,
                        $27,
                        $28,
                        $29
                    )
                `,
                values: [
                    data.id,
                    data.slug,
                    data.coverImage,
                    data.bannerImage,
                    data.trailer,
                    data.status,
                    data.season,
                    JSON.stringify(data.title),
                    data.currentEpisode,
                    JSON.stringify(data.mappings),
                    data.synonyms,
                    data.countryOfOrigin,
                    data.description,
                    data.duration,
                    data.color,
                    data.year,
                    JSON.stringify(data.rating),
                    JSON.stringify(data.popularity),
                    data.type,
                    data.format,
                    data.relations,
                    data.totalEpisodes,
                    data.genres,
                    data.tags,
                    JSON.stringify(data.episodes),
                    data.averageRating,
                    data.averagePopularity,
                    data.artwork,
                    data.characters,
                ],
            };

            const insert = await postgres.query(query);
            return insert;
        } else {
            if (!stringify) {
                try {
                    Object.assign(data, {
                        chapters: JSON.parse((data as any).chapters),
                    });
                } catch (e) {
                    //
                }
            }

            const query: QueryConfig = {
                text: `
                    INSERT INTO manga (
                        id,
                        slug,
                        "coverImage",
                        "bannerImage",
                        status,
                        title,
                        mappings,
                        synonyms,
                        "countryOfOrigin",
                        description,
                        color,
                        year,
                        rating,
                        popularity,
                        type,
                        format,
                        relations,
                        "totalChapters",
                        "totalVolumes",
                        chapters,
                        "averageRating",
                        "averagePopularity",
                        artwork,
                        characters,
                        genres,
                        tags,
                        "currentChapter"
                    ) VALUES (
                        $1,
                        $2,
                        $3,
                        $4,
                        $5,
                        $6,
                        $7,
                        $8,
                        $9,
                        $10,
                        $11,
                        $12,
                        $13,
                        $14,
                        $15,
                        $16,
                        $17,
                        $18,
                        $19,
                        $20,
                        $21,
                        $22,
                        $23,
                        $24,
                        $25,
                        $26,
                        $27
                    )
                `,
                values: [
                    data.id,
                    data.slug,
                    data.coverImage,
                    data.bannerImage,
                    data.status,
                    JSON.stringify(data.title),
                    JSON.stringify(data.mappings),
                    data.synonyms,
                    data.countryOfOrigin,
                    data.description,
                    data.color,
                    data.year,
                    JSON.stringify(data.rating),
                    data.popularity,
                    data.type,
                    data.format,
                    data.relations,
                    data.totalChapters,
                    data.totalVolumes,
                    JSON.stringify(data.chapters),
                    data.averageRating,
                    data.averagePopularity,
                    data.artwork,
                    data.characters,
                    data.genres,
                    data.tags,
                    data.currentChapter,
                ],
            };

            const insert = await postgres.query(query);
            return insert;
        }
    }

    const query = `
    INSERT INTO ${data.type === "ANIME" ? "anime" : "manga"} (
        id,
        slug,
        coverImage,
        bannerImage,
        ${data.type === Type.ANIME ? "trailer," : ""}
        status,
        ${data.type === Type.ANIME ? "season," : ""}
        title,
        ${data.type === Type.ANIME ? "currentEpisode," : ""}
        mappings,
        synonyms,
        countryOfOrigin,
        description,
        ${data.type === Type.ANIME ? "duration," : ""}
        color,
        year,
        rating,
        popularity,
        type,
        format,
        relations,
        ${data.type === Type.ANIME ? "totalEpisodes" : "totalChapters"},
        ${data.type === Type.MANGA ? "totalVolumes," : ""}
        genres,
        tags,
        ${data.type === Type.ANIME ? "episodes" : "chapters"},
        averageRating,
        averagePopularity,
        artwork,
        characters
    ) VALUES (
        $id,
        $slug,
        $coverImage,
        $bannerImage,
        ${data.type === Type.ANIME ? "$trailer," : ""}
        $status,
        ${data.type === Type.ANIME ? "$season," : ""}
        $title,
        ${data.type === Type.ANIME ? "$currentEpisode," : ""}
        $mappings,
        $synonyms,
        $countryOfOrigin,
        $description,
        ${data.type === Type.ANIME ? "$duration," : ""}
        $color,
        $year,
        $rating,
        $popularity,
        $type,
        $format,
        $relations,
        ${data.type === Type.ANIME ? "$totalEpisodes" : "$totalChapters"},
        ${data.type === Type.MANGA ? "$totalVolumes," : ""}
        $genres,
        $tags,
        ${data.type === Type.ANIME ? "$episodes" : "$chapters"},
        $averageRating,
        $averagePopularity,
        $artwork,
        $characters
    )
    `;

    const params = {
        $id: data.id,
        $slug: data.slug,
        $coverImage: data.coverImage,
        $bannerImage: data.bannerImage,
        $status: data.status,
        $title: stringify ? JSON.stringify(data.title) : data.title,
        $mappings: stringify ? JSON.stringify(data.mappings) : data.mappings,
        $synonyms: stringify ? JSON.stringify(data.synonyms) : data.synonyms,
        $countryOfOrigin: data.countryOfOrigin,
        $description: data.description,
        $color: data.color,
        $year: data.year,
        $rating: stringify ? JSON.stringify(data.rating) : data.rating,
        $popularity: stringify ? JSON.stringify(data.popularity) : data.popularity,
        $type: data.type,
        $format: data.format,
        $relations: stringify ? JSON.stringify(data.relations) : data.relations,
        $genres: stringify ? JSON.stringify(data.genres) : data.genres,
        $tags: stringify ? JSON.stringify(data.tags) : data.tags,
        $averageRating: stringify ? averageMetric(data.rating) : data.rating,
        $averagePopularity: stringify ? averageMetric(data.popularity) : data.popularity,
        $artwork: stringify ? JSON.stringify(data.artwork) : data.artwork,
        $characters: stringify ? JSON.stringify(data.characters) : data.characters,
    };

    if (data.type === Type.ANIME) {
        Object.assign(params, {
            $trailer: data.trailer,
            $season: stringify ? JSON.stringify(data.season) : data.season,
            $currentEpisode: data.currentEpisode,
            $duration: data.duration,
            $totalEpisodes: data.totalEpisodes,
            $episodes: stringify ? JSON.stringify(data.episodes) : data.episodes,
        });
    } else {
        Object.assign(params, {
            $totalChapters: data.totalChapters,
            $totalVolumes: data.totalVolumes,
            $chapters: stringify ? JSON.stringify(data.chapters) : data.chapters,
        });
    }

    const insert = sqlite.prepare(query).run(params as any);
    return insert;
};
