import AuthProvider, { Entry, ListData } from ".";
import { env, providerEnv } from "../../env";

export default class MAL extends AuthProvider {
    override rateLimit = 250;
    override id = "mal";
    override name = "MyAnimeList";
    override url = "https://myanimelist.net";
    override icon = "https://myanimelist.net/img/sp/icon/apple-touch-icon-256.png";
    override clientSecret = providerEnv.MAL_CLIENT_SECRET;
    override clientId = providerEnv.MAL_CLIENT_ID;
    override redirectUri = `${providerEnv.PUBLIC_URL}/${this.id}/callback`;

    private codeVerifier = "LHmnUsttwS1iMzpnci9FOzLP6SZihMULhhLzHRFLsgM";

    override async fetchList(userId: string, accessToken: string): Promise<ListData[] | undefined> {
        const animeList = await this.fetchListData(userId, accessToken, "ANIME");
        const mangaList = await this.fetchListData(userId, accessToken, "MANGA");

        return [...(animeList ?? []), ...(mangaList ?? [])];
    }

    private async fetchListData(userId: string, accessToken: string, type: "ANIME" | "MANGA"): Promise<ListData[] | undefined> {
        const listData: ListData[] = [];
        const statusMap: Record<string, Entry[]> = {
            completed: [],
            dropped: [],
            on_hold: [],
        };

        if (type === "ANIME") {
            statusMap.watching = [];
            statusMap.plan_to_watch = [];
        } else {
            statusMap.reading = [];
            statusMap.plan_to_read = [];
        }

        let hasNextPage = true;
        let lastNextPage = "";

        while (hasNextPage) {
            const url = `https://api.myanimelist.net/v2/users/${userId}/${type === "ANIME" ? "animelist" : "mangalist"}?fields=list_status&limit=100`;
            const response = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            const data: MALData = await response.json();

            data.data.forEach((node: MALNode) => {
                const status = node.list_status.status;
                if (statusMap.hasOwnProperty(status)) {
                    statusMap[status].push({
                        id: node.node.id.toString(),
                        hiddenFromStatusLists: false,
                        listId: node.node.id.toString(),
                        mappings: [
                            {
                                id: node.node.id.toString(),
                                providerId: this.id,
                            },
                        ],
                        priority: node.list_status.priority,
                        private: false,
                        progress: type === "ANIME" ? node.list_status.num_episodes_watched ?? 0 : node.list_status.num_chapters_read ?? 0,
                        progressVolumes: type === "ANIME" ? 0 : node.list_status.num_volumes_read ?? 0,
                        repeat: type === "ANIME" ? node.list_status.num_times_rewatched ?? 0 : node.list_status.num_times_reread ?? 0,
                        score: node.list_status.score,
                        status: node.list_status.status,
                        advancedScores: {
                            id: node.node.id.toString() + "-advanced",
                            audio: 0,
                            characters: 0,
                            enjoyment: 0,
                            entryId: node.node.id.toString(),
                            story: 0,
                            visuals: 0,
                        },
                        notes: node.list_status.comments ?? "",
                        updatedAt: new Date(node.list_status.updated_at),
                    });
                }
            });

            if (data.paging.next === lastNextPage) {
                hasNextPage = false;
                break;
            } else {
                lastNextPage = data.paging.next ?? "";
            }

            if (!data.paging.next || !lastNextPage) {
                hasNextPage = false;
                break;
            }

            hasNextPage = data.paging.next !== null;
        }

        // Concatenate the arrays from statusMap into listData
        for (const status of Object.keys(statusMap)) {
            listData.push({
                id: userId + "-" + status,
                name: status,
                type: type,
                userId: userId,
                entries: statusMap[status],
            });
        }

        return listData;
    }

    override async fetchEntry(userId: string, accessToken: string, id: string): Promise<Entry | undefined> {
        let data = await (
            await fetch(`https://api.myanimelist.net/v2/anime/${id}?fields=id,my_list_status,media_type`, {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            })
        ).json();

        if (data.error) {
            data = await (
                await fetch(`https://api.myanimelist.net/v2/manga/${id}?fields=id,my_list_status,media_type`, {
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                    },
                })
            ).json();
        }

        function parseMediaType(mediaType: string) {
            if (mediaType === "tv" || mediaType === "movie" || mediaType === "special" || mediaType === "ova" || mediaType === "ona" || mediaType === "music") {
                return "ANIME";
            } else {
                return "MANGA";
            }
        }

        if (!data.my_list_status) return;

        return {
            id: data.id.toString(),
            hiddenFromStatusLists: false,
            listId: parseMediaType(data.media_type),
            mappings: [
                {
                    id: data.id.toString(),
                    providerId: this.id,
                },
            ],
            priority: data.my_list_status?.priority ?? 0,
            private: false,
            progress: parseMediaType(data.media_type) === "ANIME" ? data.my_list_status.num_episodes_watched ?? 0 : data.my_list_status.num_chapters_read ?? 0,
            progressVolumes: parseMediaType(data.media_type) === "ANIME" ? 0 : data.my_list_status.num_volumes_read ?? 0,
            repeat: parseMediaType(data.media_type) === "ANIME" ? data.my_list_status.num_times_rewatched ?? 0 : data.my_list_status.num_times_reread ?? 0,
            score: data.my_list_status.score,
            status: data.my_list_status.status,
            advancedScores: {
                id: data.id.toString() + "-advanced",
                audio: 0,
                characters: 0,
                enjoyment: 0,
                entryId: data.id.toString(),
                story: 0,
                visuals: 0,
            },
        };
    }

    override async updateEntry(userId: string, accessToken: string, entry: Entry): Promise<any> {
        const malMapping = entry.mappings.find((mapping) => mapping.providerId === this.id);
        const malId = malMapping ? malMapping.id : "";

        const previousEntry = await this.fetchEntry(userId, accessToken, malId);

        entry = this.compareEntry(previousEntry ?? entry, entry);

        if (entry.listId === "ANIME") {
            const data = await (
                await fetch(`https://api.myanimelist.net/v2/anime/${malId}/my_list_status`, {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: `status=${entry.status}&score=${entry.score}&num_watched_episodes=${entry.progress}&is_rewatching=${entry.repeat > 0}&num_times_rewatched=${entry.repeat}&priority=${entry.priority}&comments=${entry.notes ?? ""}`,
                })
            ).json();

            return data;
        } else {
            const data = await (
                await fetch(`https://api.myanimelist.net/v2/anime/${malId}/my_list_status`, {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: `status=${entry.status}&score=${entry.score}&num_chapters_read=${entry.progress}&num_volumes_read=${entry.progressVolumes}&is_rereading=${entry.repeat > 0}&num_times_reread=${entry.repeat}&priority=${entry.priority}&comments=${entry.notes ?? ""}`,
                })
            ).json();

            return data;
        }
    }

    override async handleAuth(req: Request, res: Response): Promise<Response | undefined> {
        const url = new URL(req.url);
        const paths = url.pathname.split("/");
        paths.shift();

        const code = url.searchParams.get("code");

        try {
            const data: MALResponse = await (
                await fetch(`${this.url}/v1/oauth2/token`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                    body: `grant_type=authorization_code&client_id=${this.clientId}&client_secret=${this.clientSecret}&redirect_uri=${this.redirectUri}&code_verifier=${this.codeVerifier}&code=${code}`,
                })
            ).json();

            return Response.redirect(`${env.FRONTEND_URL}/login?token=${encodeURIComponent(data.access_token)}&expires=${Date.now() + data.expires_in * 1000}&provider=${this.id}`);
        } catch (e) {
            return new Response(JSON.stringify({ error: "Invalid code" }), { status: 400, headers: { "Content-Type": "application/json" } });
        }
    }

    get oauthURL(): string {
        return `${this.url}/v1/oauth2/authorize?response_type=code&client_id=${this.clientId}&redirect_uri=${this.redirectUri}&code_challenge=${this.codeVerifier}&code_challenge_method=plain`;
    }
}

interface MALResponse {
    token_type: string;
    expires_in: number;
    access_token: string;
    refresh_token: string;
}

interface MALNode {
    node: {
        id: number;
        title: string;
        main_picture: {
            medium: string;
            large: string;
        };
    };
    list_status: {
        status: "watching" | "reading" | "completed" | "on_hold" | "dropped" | "plan_to_watch" | "plan_to_read";
        score: number; // 0-10
        is_rewatching?: boolean;
        is_rereading?: boolean;
        num_episodes_watched?: number;
        num_volumes_read?: number;
        num_chapters_read?: number;
        priority: number;
        num_times_rewatched?: number;
        num_times_reread?: number;
        rewatch_value?: number; // 0-5
        reread_value?: number; // 0-5
        tags: string;
        comments: string;
        updated_at: string;
    };
}

interface MALData {
    data: MALNode[];
    paging: {
        next?: string;
        previous?: string;
    };
}
