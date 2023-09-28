import { db } from "../database";
import { get } from "../database/impl/fetch/get";
import { getKey } from "../database/impl/keys/key";
import { getSkipTimes } from "../database/impl/skipTimes/getSkipTimes";
import { Type } from "../types/enums";
import { Anime, Manga } from "../types/types";

const importData = async () => {
    const name = process.argv.slice(2)?.toString()?.toLowerCase() && process.argv.slice(2)?.toString()?.toLowerCase().length > 0 ? process.argv.slice(2)?.toString()?.toLowerCase() : "database.json";

    const file = Bun.file(name);
    if (!(await file.exists())) throw new Error("File does not exist! You can run bun run import <file> to import data from a specific file path.");

    const data = await file.json();

    const count = {
        anime: 0,
        manga: 0,
        skipTimes: 0,
        keys: 0,
    };

    for (const media of data.anime) {
        if (await get(media.id)) continue;

        try {
            insertMedia(media);

            count.anime++;
        } catch (error) {
            console.error(`Failed to import anime ${media.slug}!`);
            console.error(error);
        }
    }

    for (const media of data.manga) {
        if (await get(media.id)) continue;

        try {
            insertMedia(media);

            count.manga++;
        } catch (error) {
            console.error(`Failed to import manga ${media.slug}!`);
            console.error(error);
        }
    }

    for (const skipTime of data.skipTimes) {
        if (await getSkipTimes(skipTime.id)) continue;

        try {
            db.query("INSERT INTO skipTimes (id, episodes) VALUES ($id, $episodes)").run({
                $id: skipTime.id,
                $episodes: JSON.stringify(skipTime.episodes),
            });

            count.skipTimes++;
        } catch (error) {
            console.error(`Failed to import skip time ${skipTime.id}!`);
            console.error(error);
        }
    }

    for (const key of data.apiKey) {
        if (await getKey(key.id)) continue;

        try {
            db.query("INSERT INTO apiKey (id, key, requestCount, createdAt, updatedAt) VALUES ($id, $key, $requestCount, $createdAt, $updatedAt)").run({
                $id: key.id,
                $key: key.key,
                $requestCount: key.requestCount,
                $createdAt: key.createdAt,
                $updatedAt: key.updatedAt,
            });

            count.keys++;
        } catch (error) {
            console.error(`Failed to import skip time ${key.id}!`);
            console.error(error);
        }
    }

    console.log(`Imported ${count.anime} anime, ${count.manga} manga, ${count.skipTimes} skip times, and ${count.keys} API keys!`);
};

importData().then(() => {
    console.log("Exported data successfully!");
});

const insertMedia = (media: Anime | Manga) => {
    const query = `
    INSERT INTO ${media.type === "ANIME" ? "anime" : "manga"} (
        id,
        slug,
        coverImage,
        bannerImage,
        ${media.type === Type.ANIME ? "trailer," : ""}
        status,
        ${media.type === Type.ANIME ? "season," : ""}
        title,
        ${media.type === Type.ANIME ? "currentEpisode," : ""}
        mappings,
        synonyms,
        countryOfOrigin,
        description,
        ${media.type === Type.ANIME ? "duration," : ""}
        color,
        year,
        rating,
        popularity,
        type,
        format,
        relations,
        ${media.type === Type.ANIME ? "totalEpisodes" : "totalChapters"},
        ${media.type === Type.MANGA ? "totalVolumes," : ""}
        genres,
        tags,
        ${media.type === Type.ANIME ? "episodes" : "chapters"},
        averageRating,
        averagePopularity,
        artwork,
        characters
    ) VALUES (
        $id,
        $slug,
        $coverImage,
        $bannerImage,
        ${media.type === Type.ANIME ? "$trailer," : ""}
        $status,
        ${media.type === Type.ANIME ? "$season," : ""}
        $title,
        ${media.type === Type.ANIME ? "$currentEpisode," : ""}
        $mappings,
        $synonyms,
        $countryOfOrigin,
        $description,
        ${media.type === Type.ANIME ? "$duration," : ""}
        $color,
        $year,
        $rating,
        $popularity,
        $type,
        $format,
        $relations,
        ${media.type === Type.ANIME ? "$totalEpisodes" : "$totalChapters"},
        ${media.type === Type.MANGA ? "$totalVolumes," : ""}
        $genres,
        $tags,
        ${media.type === Type.ANIME ? "$episodes" : "$chapters"},
        $averageRating,
        $averagePopularity,
        $artwork,
        $characters
    )
    `;

    const params = {
        $id: media.id,
        $slug: media.slug,
        $coverImage: media.coverImage,
        $bannerImage: media.bannerImage,
        $status: media.status,
        $title: media.title,
        $mappings: media.mappings,
        $synonyms: media.synonyms,
        $countryOfOrigin: media.countryOfOrigin,
        $description: media.description,
        $color: media.color,
        $year: media.year,
        $rating: media.rating,
        $popularity: media.popularity,
        $type: media.type,
        $format: media.format,
        $relations: media.relations,
        $genres: media.genres,
        $tags: media.tags,
        $averageRating: media.averageRating,
        $averagePopularity: media.popularity,
        $artwork: media.artwork,
        $characters: media.characters,
    };

    if (media.type === Type.ANIME) {
        Object.assign(params, {
            $trailer: media.trailer,
            $season: media.season,
            $currentEpisode: media.currentEpisode,
            $duration: media.duration,
            $totalEpisodes: media.totalEpisodes,
            $episodes: media.episodes,
        });
    } else {
        Object.assign(params, {
            $totalChapters: media.totalChapters,
            $totalVolumes: media.totalVolumes,
            $chapters: media.chapters,
        });
    }

    return db.prepare(query).run(params as any);
};
