import { db } from "../..";
import { averageMetric } from "../../../helper";
import { Type } from "../../../types/enums";
import { Anime, Manga } from "../../../types/types";
import { get } from "../fetch/get";

export const create = async (data: Anime | Manga) => {
    if (await get(data.id)) return null;

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
        });
    }

    const insert = db.prepare(query).run(params);
    return insert;
};
