import { QueryConfig } from "pg";
import { sqlite, dbType, postgres } from "../..";
import { averageMetric } from "../../../helper";
import { Type } from "../../../types/enums";
import { Anime, Manga } from "../../../types/types";
import { get } from "../fetch/get";

export const update = async (data: Anime | Manga) => {
    if (!(await get(data.id))) return null;

    if (dbType == "postgresql") {
        if (data.type === Type.ANIME) {
            const query: QueryConfig = {
                text: `
                    UPDATE anime SET
                        slug = $1,
                        "coverImage" = $2,
                        "bannerImage" = $3,
                        trailer = $4,
                        status = $5,
                        season = $6,
                        title = $7,
                        "currentEpisode" = $8,
                        mappings = $9,
                        synonyms = $10,
                        "countryOfOrigin" = $11,
                        description = $12,
                        duration = $13,
                        color = $14,
                        year = $15,
                        rating = $16,
                        popularity = $17,
                        type = $18,
                        format = $19,
                        relations = $20,
                        "totalEpisodes" = $21,
                        episodes = $22,
                        "averageRating" = $23,
                        "averagePopularity" = $24,
                        artwork = $25,
                        characters = $26,
                        genres = $27,
                        tags = $28
                    WHERE id = $29
                `,
                values: [
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
                    JSON.stringify(data.episodes),
                    data.averageRating,
                    data.averagePopularity,
                    data.artwork,
                    data.characters,
                    data.genres,
                    data.tags,
                    data.id,
                ],
            };

            const update = await postgres.query(query);
            return update;
        } else {
            const query: QueryConfig = {
                text: `
                    UPDATE manga SET
                        slug = $1,
                        "coverImage" = $2,
                        "bannerImage" = $3,
                        status = $4,
                        title = $5,
                        mappings = $6,
                        synonyms = $7,
                        "countryOfOrigin" = $8,
                        description = $9,
                        color = $10,
                        year = $11,
                        rating = $12,
                        popularity = $13,
                        type = $14,
                        format = $15,
                        relations = $16,
                        "totalChapters" = $17,
                        "totalVolumes" = $18,
                        chapters = $19,
                        "averageRating" = $20,
                        "averagePopularity" = $21,
                        artwork = $22,
                        characters = $23,
                        genres = $24,
                        tags = $25
                    WHERE id = $26
                `,
                values: [
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
                    data.id,
                ],
            };
            const update = await postgres.query(query);
            return update;
        }
    }

    const query = `
    UPDATE ${data.type === "ANIME" ? "anime" : "manga"} SET
        slug = $slug,
        coverImage = $coverImage,
        bannerImage = $bannerImage,
        ${data.type === Type.ANIME ? "trailer = $trailer," : ""}
        status = $status,
        ${data.type === Type.ANIME ? "season = $season," : ""}
        title = $title,
        ${data.type === Type.ANIME ? "currentEpisode = $currentEpisode," : "currentChapter = $currentChapter,"}
        mappings = $mappings,
        synonyms = $synonyms,
        countryOfOrigin = $countryOfOrigin,
        description = $description,
        ${data.type === Type.ANIME ? "duration = $duration," : ""}
        color = $color,
        year = $year,
        rating = $rating,
        popularity = $popularity,
        type = $type,
        format = $format,
        relations = $relations,
        ${data.type === Type.ANIME ? "totalEpisodes = $totalEpisodes," : ""}
        ${data.type === Type.MANGA ? "currentChapter = $currentChapter," : ""}
        ${data.type === Type.MANGA ? "totalChapters = $totalChapters," : ""}
        ${data.type === Type.MANGA ? "totalVolumes = $totalVolumes," : ""}
        genres = $genres,
        tags = $tags,
        ${data.type === Type.ANIME ? "episodes = $episodes," : ""}
        ${data.type === Type.MANGA ? "chapters = $chapters," : ""}
        averageRating = $averageRating,
        averagePopularity = $averagePopularity,
        artwork = $artwork,
        characters = $characters
    WHERE id = $id
    `;

    const params = {
        $id: data.id,
        $slug: data.slug,
        $coverImage: data.coverImage,
        $bannerImage: data.bannerImage,
        $status: data.status,
        $title: JSON.stringify(data.title),
        $mappings: JSON.stringify(data.mappings),
        $synonyms: JSON.stringify(data.synonyms),
        $countryOfOrigin: data.countryOfOrigin,
        $description: data.description,
        $color: data.color,
        $year: data.year,
        $rating: JSON.stringify(data.rating),
        $popularity: JSON.stringify(data.popularity),
        $type: data.type,
        $format: data.format,
        $relations: JSON.stringify(data.relations),
        $genres: JSON.stringify(data.genres),
        $tags: JSON.stringify(data.tags),
        $averageRating: averageMetric(data.rating),
        $averagePopularity: averageMetric(data.popularity),
        $artwork: JSON.stringify(data.artwork),
        $characters: JSON.stringify(data.characters),
    };

    if (data.type === Type.ANIME) {
        Object.assign(params, {
            $trailer: data.trailer,
            $season: JSON.stringify(data.season),
            $currentEpisode: data.currentEpisode,
            $duration: data.duration,
            $totalEpisodes: data.totalEpisodes,
            $episodes: JSON.stringify(data.episodes),
        });
    } else {
        Object.assign(params, {
            $totalChapters: data.totalChapters,
            $totalVolumes: data.totalVolumes,
            $chapters: JSON.stringify(data.chapters),
            $currentChapter: data.currentChapter,
        });
    }

    const update = sqlite.prepare(query).run(params);
    return update;
};
