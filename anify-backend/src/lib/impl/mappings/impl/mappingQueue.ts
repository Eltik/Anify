import { MediaType, type MediaFormat } from "../../../../types";
import type { AnimeInfo, MangaInfo } from "../../../../types/impl/mappings/impl/mediaInfo";
import type { IMedia } from "../../../../types/impl/mappings";
import colors from "colors";
import { ANIME_PROVIDERS, MANGA_PROVIDERS, META_PROVIDERS } from "../../../../mappings";
import type AnimeProvider from "../../../../mappings/impl/anime";
import type MangaProvider from "../../../../mappings/impl/manga";
import type MetaProvider from "../../../../mappings/impl/meta";
import { findBestMatch } from "./helper/findBestMatch";
import { searchMedia } from "./searchMedia";
import { slugify } from "./helper/slugify";
import { createMedia } from "./createMedia";

interface MappingJob {
    id: string;
    type: MediaType;
    formats: MediaFormat[];
    baseData: AnimeInfo | MangaInfo;
    attempts: number;
    lastAttempt?: number;
    error?: string;
}

export class MappingQueue {
    private static instance: MappingQueue;
    private queue: MappingJob[] = [];
    private failedMappings: MappingJob[] = [];
    private isProcessing: boolean = false;
    private maxRetries: number = 3;
    private batchSize: number = 3; // Reduced from 5 to 3
    private minBackoff: number = 1000;
    private maxBackoff: number = 30000;
    private activeProviders: Set<AnimeProvider | MangaProvider | MetaProvider> = new Set();

    private constructor() {}

    public static getInstance(): MappingQueue {
        if (!MappingQueue.instance) {
            MappingQueue.instance = new MappingQueue();
        }
        return MappingQueue.instance;
    }

    private async cleanupProviders(): Promise<void> {
        for (const provider of this.activeProviders) {
            provider.abortRequests();
        }
        this.activeProviders.clear();
    }

    public async addToQueue(id: string, type: MediaType, formats: MediaFormat[], baseData: AnimeInfo | MangaInfo): Promise<IMedia[]> {
        const job: MappingJob = {
            id,
            type,
            formats,
            baseData,
            attempts: 0,
        };

        // Process job immediately instead of queueing
        return this.processJob(job);
    }

    private calculateBackoff(attempts: number): number {
        const backoff = Math.min(this.maxBackoff, this.minBackoff * Math.pow(2, attempts - 1) + Math.random() * 1000);
        return backoff;
    }

    private async processJob(job: MappingJob): Promise<IMedia[]> {
        try {
            job.attempts++;
            job.lastAttempt = Date.now();

            console.log(colors.gray(`Processing mapping job for ${colors.blue(job.id)} (Attempt ${job.attempts}/${this.maxRetries})`));

            const providerFactories = job.type === MediaType.ANIME ? [...ANIME_PROVIDERS, ...META_PROVIDERS] : [...MANGA_PROVIDERS, ...META_PROVIDERS];

            const allProviders = await Promise.all(providerFactories.map((factory) => factory()));

            // Clean up previous providers
            await this.cleanupProviders();

            const suitableProviders = allProviders
                .filter((provider) => {
                    if (job.formats && provider.formats) {
                        return job.formats.some((format) => provider.formats.includes(format));
                    }
                    return true;
                })
                .reduce((acc: (AnimeProvider | MangaProvider | MetaProvider)[], currentProvider) => {
                    const existingProvider = acc.find((provider) => provider.id === currentProvider.id);
                    if (!existingProvider) {
                        acc.push(currentProvider);
                        this.activeProviders.add(currentProvider);
                    }
                    return acc;
                }, []);

            console.log(colors.gray("Fetching from providers for ") + colors.blue(job.id) + colors.gray("..."));

            const mappings = [];

            // Process providers in smaller batches
            for (let i = 0; i < suitableProviders.length; i += this.batchSize) {
                const providerBatch = suitableProviders.slice(i, i + this.batchSize);
                const resultsArray = await searchMedia(job.baseData, providerBatch);

                for (let j = 0; j < resultsArray.length; j++) {
                    const providerData = resultsArray[j];
                    const currentProvider = providerBatch[j];

                    if (!providerData || providerData.length === 0) {
                        console.log(colors.gray("No results found for ") + colors.blue(job.baseData.title?.english ?? "") + colors.gray(" on ") + colors.blue(currentProvider.id) + colors.gray("."));
                        continue;
                    }

                    const match = findBestMatch(job.baseData, providerData);
                    if (match && match.similarity >= 0.7) {
                        mappings.push({
                            id: job.baseData.id,
                            slug: slugify(job.baseData.title?.english ?? job.baseData.title?.romaji ?? job.baseData.title?.native ?? ""),
                            data: match.match,
                            similarity: match.similarity,
                        });
                    }
                }

                // Add a delay between batches and clean up completed providers
                if (i + this.batchSize < suitableProviders.length) {
                    await new Promise((resolve) => setTimeout(resolve, 1000));
                    await this.cleanupProviders();
                }
            }

            console.log(colors.gray("Finished fetching from providers for ") + colors.blue(job.id) + colors.gray("."));

            const result = await createMedia(mappings, job.type);

            // Final cleanup
            await this.cleanupProviders();

            if (!result || result.length === 0) {
                throw new Error("No results found");
            }

            console.log(colors.green(`Successfully mapped ${colors.blue(job.id)}`));
            return result;
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : "Unknown error";
            console.error(colors.red(`Failed to map ${colors.blue(job.id)}: ${errorMessage}`));

            // Clean up on error
            await this.cleanupProviders();

            if (job.attempts < this.maxRetries) {
                const backoff = this.calculateBackoff(job.attempts);
                console.log(colors.yellow(`Retrying ${colors.blue(job.id)} in ${backoff / 1000}s`));
                await new Promise((resolve) => setTimeout(resolve, backoff));
                return this.processJob(job);
            } else {
                console.log(colors.red(`Mapping for ${colors.blue(job.id)} failed after ${this.maxRetries} attempts`));
                return [];
            }
        }
    }

    public getQueueStatus(): {
        queueLength: number;
        failedMappingsLength: number;
        isProcessing: boolean;
    } {
        return {
            queueLength: this.queue.length,
            failedMappingsLength: this.failedMappings.length,
            isProcessing: this.isProcessing,
        };
    }
}
