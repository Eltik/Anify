import { redis } from "../../..";
import { db } from "../../../../database";
import { env } from "../../../../env";
import middleware from "../../middleware";

const handler = async (req: Request): Promise<Response> => {
    try {
        const url = new URL(req.url);
        const paths = url.pathname.split("/");
        paths.shift();

        const body =
            req.method === "POST"
                ? ((await req.json().catch(() => {
                      return null;
                  })) as Body)
                : null;

        const id = body?.id ?? paths[1] ?? url.searchParams.get("id") ?? null;
        if (!id) {
            return middleware.createResponse(JSON.stringify({ error: "No ID provided." }), 400);
        }

        const limit = Number(body?.limit ?? url.searchParams.get("limit") ?? "10");

        const cached = await redis.get(`similar:${id}:${limit}`);
        if (cached) {
            return middleware.createResponse(cached);
        }

        // First get the source media
        const sourceQuery = `
            SELECT * FROM anify.anime WHERE id = $1
            UNION ALL
            SELECT * FROM anify.manga WHERE id = $1
            LIMIT 1;
        `;

        const sourceMedia = await db.query(sourceQuery, [id]);
        if (!sourceMedia.rows.length) {
            return middleware.createResponse(JSON.stringify({ error: "No data found." }), 404);
        }

        const source = sourceMedia.rows[0];
        const mediaType = source.type.toLowerCase();

        // Get all media of same type for comparison
        const allMediaQuery = `
            SELECT id, genres, tags, format, year, averagePopularity
            FROM anify.${mediaType} 
            WHERE id != $1;
        `;

        const allMedia = await db.query(allMediaQuery, [id]);

        // Get min/max values for normalization
        const years = allMedia.rows.map((m: { year: number }) => m.year);
        const popularities = allMedia.rows.map((m: { averagePopularity: number }) => m.averagePopularity || 0);
        const minYear = Math.min(...years, source.year);
        const maxYear = Math.max(...years, source.year);
        const minPop = Math.min(...popularities, source.averagePopularity || 0);
        const maxPop = Math.max(...popularities, source.averagePopularity || 0);

        // Convert arrays to feature vectors using one-hot encoding
        function getFeatureVector(media: { genres: string[]; tags: string[]; format: string; year: number; averagePopularity: number }) {
            // Combine all unique genres and tags to create feature space
            const allGenres = new Set([...source.genres, ...media.genres]);
            const allTags = new Set([...source.tags, ...media.tags]);

            // Normalize year and popularity to [0,1] range
            const normalizedYear = (media.year - minYear) / (maxYear - minYear || 1);
            const normalizedPopularity = ((media.averagePopularity || 0) - minPop) / (maxPop - minPop || 1);

            // Create feature vector
            const vector = [
                // Genre features
                ...Array.from(allGenres).map((g) => (media.genres.includes(g) ? 1 : 0)),
                // Tag features
                ...Array.from(allTags).map((t) => (media.tags.includes(t) ? 1 : 0)),
                // Format match
                media.format === source.format ? 1 : 0,
                // Normalized year and popularity
                normalizedYear,
                normalizedPopularity,
            ];

            return vector;
        }

        // Calculate cosine similarity between two vectors
        function cosineSimilarity(vec1: number[], vec2: number[]): number {
            const dotProduct = vec1.reduce((acc, val, i) => acc + val * vec2[i], 0);
            const mag1 = Math.sqrt(vec1.reduce((acc, val) => acc + val * val, 0));
            const mag2 = Math.sqrt(vec2.reduce((acc, val) => acc + val * val, 0));
            return dotProduct / (mag1 * mag2);
        }

        // Get source media feature vector
        const sourceVector = getFeatureVector(source);

        // Calculate similarities
        const similarities = allMedia.rows.map((media: { genres: string[]; tags: string[]; format: string; year: number; averagePopularity: number }) => {
            const vector = getFeatureVector(media);
            const similarity = cosineSimilarity(sourceVector, vector);
            return {
                ...media,
                similarity_score: similarity,
            };
        });

        // Sort by similarity score only since popularity is now part of the vector
        const results = similarities
            .sort((a: { similarity_score: number }, b: { similarity_score: number }) => b.similarity_score - a.similarity_score)
            .slice(0, limit)
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            .map(({ similarity_score, ...rest }: { similarity_score: number }) => rest);

        await redis.set(`similar:${id}:${limit}`, JSON.stringify(results), "EX", env.REDIS_CACHE_TIME);

        return middleware.createResponse(JSON.stringify(results));
    } catch (e) {
        console.error(e);
        return middleware.createResponse(JSON.stringify({ error: "An error occurred." }), 500);
    }
};

const route = {
    path: "/similar",
    handler,
    rateLimit: 50,
};

type Body = {
    id: string;
    limit?: number;
};

export default route;
