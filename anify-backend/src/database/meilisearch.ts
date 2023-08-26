import { MeiliSearch } from "meilisearch";

import colors from "colors";
import { Anime, Manga, Season } from "../mapping";
import { env } from "process";

const host = env.MEILISEARCH_URL ?? "http://localhost:7700";
const key = env.MEILISEARCH_KEY ?? "";

const client = new MeiliSearch({ host: host, apiKey: key });

export const createMeiliEntry = async (media: Anime | Manga) => {
    const exists = await info(media.id).catch(() => null);
    if (!exists) {
        await client.index(media.type.toLowerCase()).addDocuments(
            [
                {
                    id: media.id,
                    title: media.title,
                    coverImage: media.coverImage,
                    bannerImage: media.bannerImage,
                    year: media.year ?? null,
                    description: media.description,
                    genres: media.genres,
                    tags: media.tags,
                    status: media.status,
                    season: (media as Anime).season ?? Season.UNKNOWN,
                    type: media.type,
                    format: media.format,
                    rating: media.rating,
                    popularity: media.popularity,
                    synonyms: media.synonyms,
                    color: media.color,
                    mappings: media.mappings,
                    artwork: media.artwork,
                },
            ],
            { primaryKey: "id" }
        );
    }
};

const info = async (id: string) => {
    return await client.index("anime").getDocument(id);
};

export const initializeMeilisearch = async () => {
    const anime = await client.getIndex("anime").catch(() => null);
    const manga = await client.getIndex("manga").catch(() => null);

    if (!anime) {
        await client.createIndex("anime", { primaryKey: "id" });
        console.log(colors.green("Created Meilisearch index for anime."));
    }
    if (!manga) {
        await client.createIndex("manga", { primaryKey: "id" });
        console.log(colors.green("Created Meilisearch index for manga."));
    }

    await client.index("anime").updateFilterableAttributes(["format", "genres", "tags"]);
    await client.index("manga").updateFilterableAttributes(["format", "genres", "tags"]);
    await client.index("anime").updateSearchableAttributes(["title", "description", "synonyms"]);
    await client.index("manga").updateSearchableAttributes(["title", "description", "synonyms"]);
};
