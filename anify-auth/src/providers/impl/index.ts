import { isValidDate } from "../../helper";

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

    async handleAuth(req: Request, res: Response): Promise<Response | undefined> {
        return undefined;
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

    routes(): { path: string; handler: any }[] {
        const routes: { path: string; handler: any }[] = [];

        routes.push({
            path: "/",
            handler: () => {
                return new Response(JSON.stringify({ oauth: this.oauthURL }), { headers: { "Content-Type": "application/json" } });
            },
        });

        routes.push({
            path: "/entry",
            handler: async (req: Request) => {
                const url = new URL(req.url);
                const paths = url.pathname.split("/");
                paths.shift();

                const body =
                    req.method === "POST"
                        ? await req.json().catch(() => {
                              return null;
                          })
                        : null;

                const userId = body?.userId || paths[0] || url.searchParams.get("userId");
                const accessToken = body?.accessToken || paths[1] || url.searchParams.get("accessToken");
                const mediaId = body?.mediaId || paths[2] || url.searchParams.get("mediaId");

                if (!userId || userId.length === 0) {
                    return new Response(JSON.stringify({ error: "No user ID provided." }), { status: 400, headers: { "Content-Type": "application/json" } });
                }

                if (!accessToken || accessToken.length === 0) {
                    return new Response(JSON.stringify({ error: "No access token provided." }), { status: 400, headers: { "Content-Type": "application/json" } });
                }

                if (!mediaId || mediaId.length === 0) {
                    return new Response(JSON.stringify({ error: "No media ID provided." }), { status: 400, headers: { "Content-Type": "application/json" } });
                }

                const list = await this.fetchEntry(userId, accessToken, mediaId);
                return new Response(JSON.stringify(list), { headers: { "Content-Type": "application/json" } });
            },
        });

        routes.push({
            path: "/update-entry",
            handler: async (req: Request) => {
                const url = new URL(req.url);
                const paths = url.pathname.split("/");
                paths.shift();

                const body =
                    req.method === "POST"
                        ? await req.json().catch(() => {
                              return null;
                          })
                        : null;

                const userId = body?.userId || paths[0] || url.searchParams.get("userId");
                const accessToken = body?.accessToken || paths[1] || url.searchParams.get("accessToken");
                const entry = body?.entry || paths[2] || url.searchParams.get("entry");

                if (!userId || userId.length === 0) {
                    return new Response(JSON.stringify({ error: "No user ID provided." }), { status: 400, headers: { "Content-Type": "application/json" } });
                }

                if (!accessToken || accessToken.length === 0) {
                    return new Response(JSON.stringify({ error: "No access token provided." }), { status: 400, headers: { "Content-Type": "application/json" } });
                }

                if (!entry) {
                    return new Response(JSON.stringify({ error: "No entry provided." }), { status: 400, headers: { "Content-Type": "application/json" } });
                }

                const fieldsToChange: (keyof Entry)[] = ["startedAt", "completedAt", "updatedAt", "createdAt"];

                for (const field of fieldsToChange) {
                    if (entry[field] !== undefined && entry[field] !== null && !isNaN(entry[field] as any)) {
                        (entry[field] as any) = new Date(entry[field] as any);
                    }
                }

                const list = await this.updateEntry(userId, accessToken, entry);
                return new Response(JSON.stringify(list), { headers: { "Content-Type": "application/json" } });
            },
        });

        routes.push({
            path: "/list",
            handler: async (req: Request) => {
                const url = new URL(req.url);
                const paths = url.pathname.split("/");
                paths.shift();

                const body =
                    req.method === "POST"
                        ? await req.json().catch(() => {
                              return null;
                          })
                        : null;

                const userId = body?.userId || paths[0] || url.searchParams.get("userId");
                const accessToken = body?.accessToken || paths[1] || url.searchParams.get("accessToken");

                if (!userId || userId.length === 0) {
                    return new Response(JSON.stringify({ error: "No user ID provided." }), { status: 400, headers: { "Content-Type": "application/json" } });
                }

                if (!accessToken || accessToken.length === 0) {
                    return new Response(JSON.stringify({ error: "No access token provided." }), { status: 400, headers: { "Content-Type": "application/json" } });
                }

                const list = await this.fetchList(userId, accessToken);
                return new Response(JSON.stringify(list), { headers: { "Content-Type": "application/json" } });
            },
        });

        routes.push({
            path: "/oauth",
            handler: async (req: Request) => {
                return new Response(JSON.stringify({ oauth: this.oauthURL }), { headers: { "Content-Type": "application/json" } });
            },
        });

        routes.push({
            path: "/callback",
            handler: async (req: Request, res: Response) => {
                const data = await this.handleAuth(req, res);
                if (!data) return new Response(JSON.stringify({ error: "Something went wrong." }), { status: 500, headers: { "Content-Type": "application/json" } });

                return new Response(JSON.stringify(data), { headers: { "Content-Type": "application/json" } });
            },
        });

        return routes;
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
