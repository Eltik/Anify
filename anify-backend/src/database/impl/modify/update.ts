import { db } from "../..";
import { averageMetric } from "../../../helper";
import { Type } from "../../../types/enums";
import { Anime, Manga } from "../../../types/types";
import { get } from "./get";

export const update = async (data: Anime | Manga) => {
    if (!(await get(data.id))) return null;

    const query = `
    UPDATE ${data.type === "ANIME" ? "anime" : "manga"} SET
        slug = $slug,
        coverImage = $coverImage,
        bannerImage = $bannerImage,
        ${data.type === Type.ANIME ? "trailer = $trailer," : ""}
        status = $status,
        ${data.type === Type.ANIME ? "season = $season," : ""}
        title = $title,
        ${data.type === Type.ANIME ? "currentEpisode = $currentEpisode," : ""}
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
            $trailer: (data as Anime).trailer,
            $season: JSON.stringify((data as Anime).season),
            $currentEpisode: (data as Anime).currentEpisode,
            $duration: (data as Anime).duration,
            $totalEpisodes: (data as Anime).totalEpisodes,
            $episodes: JSON.stringify((data as Anime).episodes),
        });
    } else {
        Object.assign(params, {
            $totalChapters: (data as Manga).totalChapters,
            $totalVolumes: (data as Manga).totalVolumes,
            $chapters: JSON.stringify((data as Manga).chapters),
        });
    }

    const update = await db.prepare(query).run(params);
    return update;
};
