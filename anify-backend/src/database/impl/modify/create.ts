import { db, dbType, prisma } from "../..";
import { averageMetric } from "../../../helper";
import { Season, Type } from "../../../types/enums";
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

            return await prisma.anime.create({
                data: {
                    id: data.id,
                    slug: data.slug,
                    coverImage: data.coverImage,
                    bannerImage: data.bannerImage,
                    trailer: data.trailer,
                    status: data.status,
                    season: data.season ?? Season.UNKNOWN,
                    title: data.title,
                    currentEpisode: data.currentEpisode,
                    mappings: data.mappings,
                    synonyms: data.synonyms,
                    countryOfOrigin: data.countryOfOrigin,
                    description: data.description,
                    duration: data.duration,
                    color: data.color,
                    year: data.year,
                    rating: data.rating,
                    popularity: data.popularity,
                    type: data.type,
                    format: data.format,
                    relations: data.relations,
                    totalEpisodes: data.totalEpisodes,
                    episodes: data.episodes,
                    averageRating: averageMetric(data.rating),
                    averagePopularity: averageMetric(data.popularity),
                    artwork: data.artwork,
                    characters: data.characters,
                    genres: data.genres,
                    tags: data.tags,
                },
            });
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
            
            return await prisma.manga.create({
                data: {
                    id: data.id,
                    slug: data.slug,
                    coverImage: data.coverImage,
                    bannerImage: data.bannerImage,
                    status: data.status,
                    title: data.title,
                    mappings: data.mappings,
                    synonyms: data.synonyms,
                    countryOfOrigin: data.countryOfOrigin,
                    description: data.description,
                    color: data.color,
                    year: data.year,
                    rating: data.rating,
                    popularity: data.popularity,
                    type: data.type,
                    format: data.format,
                    relations: data.relations,
                    totalChapters: data.totalChapters,
                    totalVolumes: data.totalVolumes,
                    chapters: data.chapters,
                    averageRating: averageMetric(data.rating),
                    averagePopularity: averageMetric(data.popularity),
                    artwork: data.artwork,
                    characters: data.characters,
                    currentChapter: data.currentChapter ?? null,
                    genres: data.genres,
                    tags: data.tags,
                },
            });
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

    const insert = db.prepare(query).run(params as any);
    return insert;
};
