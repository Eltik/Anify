import { isValidDate } from "@/src/helper";
import { FastifyInstance, FastifyReply, FastifyRequest, RegisterOptions } from "fastify";

export default abstract class AuthProvider {
    abstract rateLimit: number;
    abstract id: string;
    abstract name: string;
    abstract url: string;
    abstract icon: string;
    abstract clientId: string;
    abstract clientSecret: string;
    abstract redirectUri: string;

    constructor() {
        this.routes = this.routes.bind(this);
    }

    async handleAuth(req: FastifyRequest, res: FastifyReply): Promise<void | undefined> {
        return;
    }

    async fetchList(userId: string, accessToken: string): Promise<ListData[] | undefined> {
        return undefined;
    }

    async fetchEntry(userId: string, accessToken: string, id: string): Promise<Entry | undefined> {
        return undefined;
    }

    async updateEntry(userId: string, accessToken: string, entry: Entry): Promise<any> {
        return;
    }

    compareEntry(entry1: Entry, entry2: Entry): Entry {
        const entry: Entry = { ...entry1 }; // Create a shallow copy of entry1

        const fieldsToChange: (keyof Entry)[] = ["status", "notes", "score", "progress", "progressVolumes", "repeat", "priority", "startedAt", "completedAt", "updatedAt", "createdAt", "advancedScores"];

        for (const field of fieldsToChange) {
            if (entry2[field] !== undefined && entry2[field] !== entry1[field]) {
                if (field === "completedAt" || field === "createdAt" || field === "startedAt" || field === "updatedAt") {
                    if (!isValidDate(entry2[field])) continue;
                }

                (entry[field] as any) = entry2[field];
            }
        }

        return entry;
    }

    async routes(fastify: FastifyInstance, options: RegisterOptions): Promise<void> {
        fastify.get("/", (_, reply) => {
            reply.status(200).send({ oauth: this.oauthURL });
        });

        fastify.get("/entry", async (request, reply) => {
            const { userId, accessToken, mediaId } = request.query as { userId: string; accessToken: string; mediaId: string };

            if (!userId || userId.length === 0) {
                return reply.status(400).send({ error: "No user ID provided." });
            }
            if (!accessToken || accessToken.length === 0) {
                return reply.status(400).send({ error: "No access token provided." });
            }
            if (!mediaId || mediaId.length === 0) {
                return reply.status(400).send({ error: "No media ID provided." });
            }

            const list = await this.fetchEntry(userId, accessToken, mediaId);
            return list;
        });

        fastify.post("/entry", async (request, reply) => {
            const { userId, accessToken, mediaId } = request.body as { userId: string; accessToken: string; mediaId: string };

            if (!userId || userId.length === 0) {
                return reply.status(400).send({ error: "No user ID provided." });
            }
            if (!accessToken || accessToken.length === 0) {
                return reply.status(400).send({ error: "No access token provided." });
            }
            if (!mediaId || mediaId.length === 0) {
                return reply.status(400).send({ error: "No media ID provided." });
            }

            const list = await this.fetchEntry(userId, accessToken, mediaId);
            return list;
        });

        fastify.post("/update-entry", async (request, reply) => {
            const { userId, accessToken, entry } = request.body as { userId: string; accessToken: string; entry: Entry };

            if (!userId || userId.length === 0) {
                return reply.status(400).send({ error: "No user ID provided." });
            }
            if (!accessToken || accessToken.length === 0) {
                return reply.status(400).send({ error: "No access token provided." });
            }
            if (!entry) {
                return reply.status(400).send({ error: "No entry provided." });
            }

            const fieldsToChange: (keyof Entry)[] = ["startedAt", "completedAt", "updatedAt", "createdAt"];

            for (const field of fieldsToChange) {
                if (entry[field] !== undefined && entry[field] !== null && !isNaN(entry[field] as any)) {
                    (entry[field] as any) = new Date(entry[field] as any);
                }
            }

            const list = await this.updateEntry(userId, accessToken, entry);
            return list;
        });

        fastify.get("/list", async (request, reply) => {
            const { userId, accessToken } = request.query as { userId: string; accessToken: string };

            if (!userId || userId.length === 0) {
                return reply.status(400).send({ error: "No user ID provided." });
            }
            if (!accessToken || accessToken.length === 0) {
                return reply.status(400).send({ error: "No access token provided." });
            }

            const list = await this.fetchList(userId, accessToken);
            return list;
        });

        fastify.post("/list", async (request, reply) => {
            const { userId, accessToken } = request.body as { userId: string; accessToken: string };

            if (!userId || userId.length === 0) {
                return reply.status(400).send({ error: "No user ID provided." });
            }
            if (!accessToken || accessToken.length === 0) {
                return reply.status(400).send({ error: "No access token provided." });
            }

            const list = await this.fetchList(userId, accessToken);
            return list;
        });

        fastify.get("/oauth", (_, reply) => {
            reply.status(200).send({ oauth: this.oauthURL });
        });

        fastify.get("/callback", async (request, reply) => {
            return (await this.handleAuth(request, reply)) || reply.status(500).send({ error: "Something went wrong." });
        });
    }

    abstract get oauthURL(): string;
}

export interface User {
    id: string;
    simklId?: number;
    anilistId?: number;
    malId?: number;
    lists: ListData[];
}

export interface ListData {
    id: string;
    name: string;
    type: string;
    userId: string;
    user?: User;
    entries: Entry[];
}

export interface Entry {
    id: string;
    listId: string;
    status: string;
    score: number;
    progress: number;
    progressVolumes: number;
    repeat: number;
    priority: number;
    private: boolean;
    mappings: Mappings[];
    notes?: string;
    hiddenFromStatusLists: boolean;
    advancedScores?: AdvancedScores;
    startedAt?: Date;
    completedAt?: Date;
    updatedAt?: Date;
    createdAt?: Date;
}

export interface AdvancedScores {
    id: string;
    entryId: string;
    story: number;
    characters: number;
    visuals: number;
    audio: number;
    enjoyment: number;
    updatedAt?: Date;
    createdAt?: Date;
}

export interface Mappings {
    id: string;
    providerId: string;
}
