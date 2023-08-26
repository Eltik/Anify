import { AUTH_PROVIDERS, authProviders } from "@/src/providers";
import { prisma } from "./database";
import { env } from "@/src/env";
import { Entry, ListData } from "@/src/providers/impl";

export const sync = async (userId: string, accessTokens: AccessTokens) => {
    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
    });

    if (!user) return;

    console.log("Syncing user " + user.id);

    const { simklId, anilistId, malId } = user;

    const listData: ListData[] = [];

    if (anilistId) {
        console.log("Syncing AniList profile for " + user.id);

        const lists = await authProviders.anilist.fetchList(String(anilistId), accessTokens.anilist ?? "");

        for (const list of lists ?? []) {
            for (const entry of list.entries) {
                const aniListMapping = entry.mappings.find((mapping) => mapping.providerId === "anilist");
                const anilistId = aniListMapping ? aniListMapping.id : "";
                const info = await (await fetch(`${env.BACKEND_URL}/info?id=${anilistId}&apikey=${env.BACKEND_KEY}`)).json();
                if (!info || !info?.mappings) continue;

                const mappings = info.mappings.concat([
                    {
                        id: info.id,
                        providerId: "anilist",
                    },
                ]);

                mappings.push({
                    id: anilistId,
                    providerId: "anilist",
                });

                entry.mappings = mappings;

                for (const provider of AUTH_PROVIDERS) {
                    if (provider.id === "anilist") continue;

                    await provider.updateEntry(userId, accessTokens[provider.id], entry);
                    console.log("Updated entry " + entry.id);
                }
                /*
                await prisma.entry.upsert({
                    where: {
                        id: entry.id
                    },
                    create: {
                        id: entry.id,
                        title: entry.title,
                        type: entry.type,
                        status: entry.status,
                        progress: entry.progress,
                        score: entry.score,
                        startedAt: entry.startedAt,
                        completedAt: entry.completedAt,
                        updatedAt: entry.updatedAt,
                        user: {
                            connect: {
                                id: userId
                            }
                        }
                    },
                    update: {
                        title: entry.title,
                        type: entry.type,
                        status: entry.status,
                        progress: entry.progress,
                        score: entry.score,
                        startedAt: entry.startedAt,
                        completedAt: entry.completedAt,
                        updatedAt: entry.updatedAt
                    }
                });
                */
            }
        }
    }

    if (malId) {
        console.log("Syncing MAL profile for " + user.id);

        const lists = await authProviders.mal.fetchList(String(malId), accessTokens.mal ?? "");

        for (const list of lists ?? []) {
            for (const entry of list.entries) {
                const malMapping = entry.mappings.find((mapping) => mapping.providerId === "mal");
                const malId = malMapping ? malMapping.id : "";
                const info = await (await fetch(`${env.BACKEND_URL}/media?id=${malId}&providerId=${"mal"}&apikey=${env.BACKEND_KEY}`)).json();
                if (!info || !info?.mappings) continue;

                const mappings = info.mappings.concat([
                    {
                        id: info.id,
                        providerId: "anilist",
                    },
                ]);

                entry.mappings = mappings;

                for (const provider of AUTH_PROVIDERS) {
                    if (provider.id === "mal") continue;

                    await provider.updateEntry(userId, accessTokens[provider.id], entry);
                    console.log("Updated entry " + entry.id);
                }
            }
        }
    }
};

interface AccessTokens {
    anilist?: string;
    simkl?: string;
    mal?: string;
}
