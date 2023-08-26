import { randomUUID } from "crypto";
import { Anime, Format, Genres, Manga, Type } from "../mapping";
import { prisma, search as searchPostgres, searchAdvanced as searchAdvancedPostgres, seasonal as seasonalPostgres, info as infoPostgres, media as mediaPostgres, recent } from "./postgresql";
import { createMeiliEntry, initializeMeilisearch } from "./meilisearch";
import { env } from "../env";
import cluster from "cluster";

export default class Database {
    private static type = "postgresql";
    private static useMeilisearch = env.USE_MEILISEARCH;

    static async initializeDatabase() {
        if (this.type === "postgresql") {
            await prisma.$connect();
            if (cluster.isPrimary) {
                await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pg_trgm;`;
                await prisma.$executeRaw`create or replace function most_similar(text, text[]) returns double precision
                language sql as $$
                    select max(similarity($1,x)) from unnest($2) f(x)
                $$;`;
            }
        }

        if (this.useMeilisearch && cluster.isPrimary) {
            await initializeMeilisearch();
        }
    }

    static async search(query: string, type: Type, formats: Format[], page: number, perPage: number): Promise<Anime[] | Manga[]> {
        if (this.type === "postgresql") {
            return await searchPostgres(query, type, formats, page, perPage);
        } else {
            return [];
        }
    }

    static async searchAdvanced(query: string, type: Type, formats: Format[], page: number, perPage: number, genres: Genres[] = [], genresExcluded: Genres[] = [], year = 0, tags: string[] = [], tagsExcluded: string[] = []): Promise<Anime[] | Manga[]> {
        if (this.type === "postgresql") {
            return await searchAdvancedPostgres(query, type.toUpperCase() as Type, formats, page, 40, genres as Genres[], genresExcluded as Genres[], year, tags, tagsExcluded);
        } else {
            return [];
        }
    }

    static async seasonal(trending: Anime[] | Manga[], popular: Anime[] | Manga[], top: Anime[] | Manga[], seasonal: Anime[] | Manga[]) {
        if (this.type === "postgresql") {
            return await seasonalPostgres(trending, popular, top, seasonal);
        } else {
            return {
                trending: [],
                popular: [],
                top: [],
                seasonal: [],
            };
        }
    }

    static async info(id: string): Promise<Anime | Manga | null> {
        if (this.type === "postgresql") {
            return (await infoPostgres(id)) as Anime | Manga;
        } else {
            return null;
        }
    }

    static async media(providerId: string, id: string): Promise<Anime | Manga | null> {
        if (this.type === "postgresql") {
            return (await mediaPostgres(providerId, id)) as Anime | Manga;
        } else {
            return null;
        }
    }

    static async relations(id: string): Promise<Anime[] | Manga[] | null> {
        if (this.type !== "postgresql") {
            return null;
        }

        const info = await this.info(id);
        const relations = info?.relations ?? [];

        const relatedMediaPromises = relations.map(async (relation) => {
            const media = await this.info(relation.id);
            Object.assign(media ?? {}, { relationType: relation.relationType })
            return media as Anime | Manga | null;
        });

        const relatedMedia = await Promise.all(relatedMediaPromises);
        const filteredMedia = relatedMedia.filter((media) => media !== null) as (Anime | Manga)[];

        return filteredMedia as Anime[] | Manga[];
    }

    static async fetchAll(type: Type): Promise<Anime[] | Manga[]> {
        if (this.type === "postgresql") {
            if (type === Type.ANIME) {
                return (await prisma.anime.findMany()) as any[];
            } else {
                return (await prisma.manga.findMany()) as any[];
            }
        } else {
            return [];
        }
    }

    static async update(id: string, type: Type, data: any): Promise<void> {
        if (this.type === "postgresql") {
            if (type === Type.ANIME) {
                await prisma.anime.update({
                    where: {
                        id: id,
                    },
                    data,
                });
            } else {
                await prisma.manga.update({
                    where: {
                        id: id,
                    },
                    data,
                });
            }
        }
    }

    static async delete(id: string): Promise<void> {
        if (this.type === "postgresql") {
            const info = await infoPostgres(id);
            if (info?.type === Type.ANIME) {
                await prisma.anime.delete({
                    where: {
                        id: info?.id,
                    },
                });
            } else {
                await prisma.manga.delete({
                    where: {
                        id: info?.id,
                    },
                });
            }
        } else {
            return;
        }
    }

    static async createEntry(media: Anime | Manga): Promise<void> {
        if (this.type === "postgresql") {
            if (media.type === Type.ANIME) {
                await prisma.anime.create({
                    data: media,
                });
            } else {
                await prisma.manga.create({
                    data: media,
                });
            }
        }

        if (this.useMeilisearch) {
            await createMeiliEntry(media);
        }
    }

    static async createEntrys(media: Anime[] | Manga[]): Promise<void> {
        if (this.type === "postgresql") {
            if (media[0]?.type === Type.ANIME) {
                await prisma.anime.createMany({
                    data: media,
                    skipDuplicates: true,
                });
            } else {
                await prisma.manga.createMany({
                    data: media,
                    skipDuplicates: true,
                });
            }
        }

        if (this.useMeilisearch) {
            for (const m of media) {
                await createMeiliEntry(m);
            }
        }
    }

    static async findSkipTimes(id: string) {
        if (this.type === "postgresql") {
            return await prisma.skipTimes.findUnique({
                where: {
                    id: id,
                },
            });
        }
    }

    static async updateSkipTimes(id: string, episodes: { duration: string; intro: { start: number; end: number }; outro: { start: number; end: number }; number: number }[]): Promise<void> {
        if (this.type === "postgresql") {
            await prisma.skipTimes.upsert({
                where: {
                    id: id,
                },
                update: {
                    episodes: episodes,
                },
                create: {
                    id: id,
                    episodes: episodes,
                },
            });
        }
    }

    static async createAPIKey(key: string): Promise<string> {
        if (this.type === "postgresql") {
            if (await prisma.apiKey.findFirst({ where: { key } })) {
                return key;
            }
            await prisma.apiKey.create({
                data: {
                    key,
                },
            });

            return key;
        } else {
            return "";
        }
    }

    static async insertAPIKey(data: any): Promise<void> {
        if (this.type === "postgresql") {
            if (await prisma.apiKey.findFirst({ where: { key: data.key } })) {
                return;
            }
            await prisma.apiKey.create({
                data,
            });

            return;
        } else {
            return;
        }
    }

    static async updateKeyRequests(key: string, requests: number): Promise<void> {
        if (this.type === "postgresql") {
            await prisma.apiKey.update({
                where: {
                    key,
                },
                data: {
                    requestCount: requests,
                },
            });
        }
    }

    static async assignKey(key: string, id: string): Promise<boolean | undefined> {
        if (this.type === "postgresql") {
            const exists = await prisma.apiKey.findFirst({
                where: {
                    id,
                },
            });

            if (exists) {
                return false;
            }

            await prisma.apiKey.update({
                where: {
                    key,
                },
                data: {
                    id,
                },
            });

            return true;
        }
    }

    static async unassignKey(key: string): Promise<boolean | undefined> {
        if (this.type === "postgresql") {
            const exists = await prisma.apiKey.findFirst({
                where: {
                    key,
                },
            });

            if (!exists) {
                return false;
            }

            await prisma.apiKey.update({
                where: {
                    key,
                },
                data: {
                    id: randomUUID(),
                },
            });

            return true;
        }
    }

    static async getKeyById(id: string): Promise<any | undefined> {
        if (this.type === "postgresql") {
            return await prisma.apiKey.findFirst({
                where: {
                    id,
                },
            });
        }
    }

    static async deleteKey(key: string): Promise<void> {
        if (this.type === "postgresql") {
            await prisma.apiKey.delete({
                where: {
                    key,
                },
            });
        }
    }

    static async fetchAPIKey(key: string): Promise<any> {
        if (this.type === "postgresql") {
            return await prisma.apiKey.findUnique({
                where: {
                    key,
                },
            });
        } else {
            return null;
        }
    }

    static async fetchAPIKeys(): Promise<string[]> {
        if (this.type === "postgresql") {
            const apiKeys = await prisma.apiKey.findMany();
            return apiKeys.map((key) => key.key);
        } else {
            return [];
        }
    }

    static async fetchAllAPIKeys(): Promise<any[]> {
        if (this.type === "postgresql") {
            const apiKeys = await prisma.apiKey.findMany();
            return apiKeys;
        } else {
            return [];
        }
    }

    static async fetchAllSkipTimes(): Promise<any[]> {
        if (this.type === "postgresql") {
            const skipTimes = await prisma.skipTimes.findMany();
            return skipTimes;
        } else {
            return [];
        }
    }

    static async recent(type: Type, formats: Format[], page = 1): Promise<Anime[] | Manga[]> {
        if (this.type === "postgresql") {
            const data = await recent(type, formats, page, 30);
            return data;
        } else {
            return [];
        }
    }

    static async clear(): Promise<{ anime: number; manga: number; skipTimes: number; apiKeys: number }> {
        if (this.type === "postgresql") {
            const animeDelete = prisma.anime.deleteMany({});
            const mangaDelete = prisma.manga.deleteMany({});
            const skipTimesDelete = prisma.skipTimes.deleteMany({});
            const apiKeyDelete = prisma.apiKey.deleteMany({});

            const [animeResult, mangaResult, skipTimesResult, apiKeyResults] = await Promise.all([animeDelete, mangaDelete, skipTimesDelete, apiKeyDelete]);
            return {
                anime: animeResult.count,
                manga: mangaResult.count,
                skipTimes: skipTimesResult.count,
                apiKeys: apiKeyResults.count,
            };
        } else {
            return {
                anime: 0,
                manga: 0,
                skipTimes: 0,
                apiKeys: 0,
            };
        }
    }

    static async count() {
        const data = {
            anime: 0,
            manga: 0,
            novels: 0,
            apiKeys: 0,
            skipTimes: 0,
        };

        if (this.type === "postgresql") {
            const manga = await prisma.manga.count();
            const mangaNotNovels = await prisma.manga.count({
                where: {
                    format: {
                        not: "NOVEL",
                    },
                },
            });

            data.anime = await prisma.anime.count();
            data.manga = mangaNotNovels;
            data.novels = manga - mangaNotNovels;

            data.apiKeys = await prisma.apiKey.count();

            const totalSkipTimes = await prisma.skipTimes.findMany();

            for (const skipTime of totalSkipTimes) {
                const episodes = skipTime.episodes;
                for (let i = 0; i < episodes.length; i++) {
                    if (episodes[i].outro?.end != 0) {
                        data.skipTimes++;
                    }
                }
            }
        }

        return data;
    }
}
