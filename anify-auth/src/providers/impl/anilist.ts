import AuthProvider, { AdvancedScores, Entry, ListData } from ".";
import { env, providerEnv } from "../../env";
import { generateUUID } from "../../helper";

export default class AniList extends AuthProvider {
    override rateLimit = 250;
    override id = "anilist";
    override name = "AniList";
    override url = "https://anilist.co";
    override icon = "https://anilist.co/img/icons/android-chrome-512x512.png";
    override clientSecret = providerEnv.ANILIST_CLIENT_SECRET;
    override clientId = providerEnv.ANILIST_CLIENT_ID;
    override redirectUri = `${providerEnv.PUBLIC_URL}/${this.id}/callback`;

    override async fetchList(userId: string, accessToken: string): Promise<ListData[] | undefined> {
        const animeList = await this.fetchListData(userId, accessToken, "ANIME");
        const mangaList = await this.fetchListData(userId, accessToken, "MANGA");

        return [...(animeList ?? []), ...(mangaList ?? [])];
    }

    private async fetchListData(userId: string, accessToken: string, type: "ANIME" | "MANGA"): Promise<ListData[] | undefined> {
        const data = (await (
            await fetch(`https://graphql.anilist.co`, {
                method: "POST",
                body: JSON.stringify({
                    query: `
                query ($userId: Int, $type: MediaType) {
                    MediaListCollection(userId: $userId, type: $type) {
                        lists {
                            name
                            isCustomList
                            isCompletedList: isSplitCompletedList
                            entries {
                                ...mediaListEntry
                            }
                        }
                        user {
                            id
                            name
                            avatar {
                                large
                            }
                            mediaListOptions {
                                scoreFormat
                                rowOrder
                                animeList {
                                    sectionOrder
                                    customLists
                                    splitCompletedSectionByFormat
                                    theme
                                }
                                mangaList {
                                    sectionOrder
                                    customLists
                                    splitCompletedSectionByFormat
                                    theme
                                }
                            }
                        }
                    }
                }
                    
                fragment mediaListEntry on MediaList {
                    id
                    mediaId
                    status
                    score
                    progress
                    progressVolumes
                    repeat
                    priority
                    private
                    hiddenFromStatusLists
                    customLists
                    advancedScores
                    notes
                    updatedAt
                    startedAt {
                        year
                        month
                        day
                    }
                    completedAt {
                        year
                        month
                        day
                    }
                    media {
                        id
                        title {
                            userPreferred
                            romaji
                            english
                            native
                        }
                        coverImage {
                            extraLarge
                            large
                        }
                        type
                        format
                        status(version: 2)
                        episodes
                        volumes
                        chapters
                        averageScore
                        popularity
                        isAdult
                        countryOfOrigin
                        genres
                        bannerImage
                        startDate {
                            year
                            month
                            day
                        }
                    }
                }             
                `,
                    variables: {
                        userId: parseInt(userId),
                        type,
                    },
                }),
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    "Content-Type": "application/json",
                    Accept: "application/json",
                },
            })
        ).json()) as AniListData;

        const listData: ListData[] = [];

        for (const list of data?.data.MediaListCollection?.lists ?? []) {
            const entries: Entry[] = [];
            for (const entry of list.entries) {
                const advancedScores: AdvancedScores = {
                    id: String(entry.id) + "-advanced",
                    entryId: String(entry.id),
                    audio: entry.advancedScores.Audio,
                    characters: entry.advancedScores.Characters,
                    createdAt: new Date(`${entry.startedAt.month}/${entry.startedAt.day}/${entry.startedAt.year}`),
                    enjoyment: entry.advancedScores.Enjoyment,
                    story: entry.advancedScores.Story,
                    updatedAt: new Date(entry.updatedAt),
                    visuals: entry.advancedScores.Visuals,
                };

                entries.push({
                    id: String(entry.mediaId),
                    completedAt: new Date(`${entry.completedAt.month}/${entry.completedAt.day}/${entry.completedAt.year}`),
                    createdAt: new Date(`${entry.startedAt.month}/${entry.startedAt.day}/${entry.startedAt.year}`),
                    startedAt: new Date(`${entry.startedAt.month}/${entry.startedAt.day}/${entry.startedAt.year}`),
                    hiddenFromStatusLists: entry.hiddenFromStatusLists,
                    priority: entry.priority,
                    private: entry.private,
                    progress: entry.progress,
                    progressVolumes: entry.progressVolumes,
                    repeat: entry.repeat,
                    score: entry.score,
                    status: entry.status,
                    updatedAt: new Date(entry.updatedAt),
                    mappings: [
                        {
                            id: String(entry.mediaId),
                            providerId: this.id,
                        },
                    ],
                    notes: entry.notes ?? "",
                    listId: list.name,
                    advancedScores,
                });
            }

            listData.push({
                id: generateUUID(),
                entries,
                name: list.name,
                type,
                userId: String(data?.data.MediaListCollection?.user.id),
            });
        }

        return listData;
    }

    override async fetchEntry(userId: string, accessToken: string, id: string): Promise<Entry | undefined> {
        const req = await (
            await fetch(`https://graphql.anilist.co`, {
                method: "POST",
                body: JSON.stringify({
                    query: `
                        query($mediaId: Int) {
                            Media(id: $mediaId) {
                                id title {
                                    userPreferred
                                }
                                coverImage {
                                    large
                                }
                                bannerImage type status(version: 2) episodes chapters volumes isFavourite mediaListEntry {
                                    id mediaId status score advancedScores progress progressVolumes repeat priority private hiddenFromStatusLists customLists notes updatedAt startedAt {
                                        year month day
                                    }
                                    completedAt {
                                        year month day
                                    }
                                    user {
                                        id name
                                    }
                                }
                            }
                        }
                        `,
                    variables: {
                        mediaId: id,
                    },
                }),
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
            })
        ).json();

        const data: MediaListEntry = req?.data?.Media?.mediaListEntry;

        if (!data) return req;

        return {
            id: String(data.id),
            completedAt: data.completedAt ? new Date(`${data.completedAt.day}/${data.completedAt.month}/${data.completedAt.year}`) : undefined,
            hiddenFromStatusLists: data.hiddenFromStatusLists,
            listId: "",
            mappings: [
                {
                    id: String(data.mediaId),
                    providerId: this.id,
                },
            ],
            priority: data.priority,
            private: data.private,
            progress: data.progress,
            progressVolumes: data.progressVolumes,
            repeat: data.repeat,
            score: data.score,
            startedAt: data.startedAt ? new Date(`${data.startedAt.day}/${data.startedAt.month}/${data.startedAt.year}`) : undefined,
            status: data.status,
            updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
            advancedScores: {
                audio: data.advancedScores?.Audio ?? 0,
                characters: data.advancedScores?.Characters ?? 0,
                enjoyment: data.advancedScores?.Enjoyment ?? 0,
                id: generateUUID(),
                entryId: String(data.id),
                story: data.advancedScores?.Story ?? 0,
                updatedAt: data.updatedAt ? new Date(data.updatedAt) : undefined,
                visuals: data.advancedScores?.Visuals ?? 0,
            },
            notes: data.notes,
        };
    }

    override async updateEntry(userId: string, accessToken: string, entry: Entry): Promise<any> {
        const aniListMapping = entry.mappings.find((mapping) => mapping.providerId === this.id);
        const anilistId = aniListMapping ? aniListMapping.id : "";

        if (!anilistId) return;

        const previousEntry = await this.fetchEntry(userId, accessToken, anilistId);

        entry = this.compareEntry(previousEntry ?? entry, entry);

        const data = await (
            await fetch(`https://graphql.anilist.co`, {
                method: "POST",
                body: JSON.stringify({
                    query: `
                mutation($id: Int $mediaId: Int $status: MediaListStatus $score: Float $progress: Int $progressVolumes: Int $repeat: Int $private: Boolean $notes: String $customLists: [String] $hiddenFromStatusLists: Boolean $advancedScores: [Float] $startedAt: FuzzyDateInput $completedAt: FuzzyDateInput) {
                    SaveMediaListEntry(id: $id mediaId: $mediaId status: $status score: $score progress: $progress progressVolumes: $progressVolumes repeat: $repeat private: $private notes: $notes customLists: $customLists hiddenFromStatusLists: $hiddenFromStatusLists advancedScores: $advancedScores startedAt: $startedAt completedAt: $completedAt) {
                        id mediaId status score advancedScores progress progressVolumes repeat priority private hiddenFromStatusLists customLists notes updatedAt startedAt {
                            year month day
                        }
                        completedAt {
                            year month day
                        }
                        user {
                            id name
                        }
                        media {
                            id title {
                                userPreferred
                            }
                            coverImage {
                                large
                            }
                            type format status episodes volumes chapters averageScore popularity isAdult startDate {
                                year
                            }
                        }
                    }
                }
                `,
                    variables: {
                        progress: entry.progress,
                        score: entry.score,
                        advancedScores: [entry.advancedScores?.audio ?? 0, entry.advancedScores?.characters ?? 0, entry.advancedScores?.enjoyment ?? 0, entry.advancedScores?.story ?? 0, entry.advancedScores?.visuals ?? 0],
                        notes: entry.notes ?? "",
                        repeat: entry.repeat,
                        completedAt: entry.completedAt
                            ? {
                                  year: entry.completedAt.getFullYear(),
                                  month: entry.completedAt.getMonth(),
                                  day: entry.completedAt.getDate(),
                              }
                            : null,
                        private: entry.private,
                        mediaId: anilistId,
                    },
                }),
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
            })
        ).json();

        return data;
    }

    override async handleAuth(req: Request, res: Response): Promise<Response> {
        const url = new URL(req.url);
        const paths = url.pathname.split("/");
        paths.shift();

        const code = url.searchParams.get("code");

        try {
            const data: AniListResult = await (
                await fetch(`${this.url}/api/v2/oauth/token`, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        Accept: "application/json",
                    },
                    body: JSON.stringify({
                        grant_type: "authorization_code",
                        client_id: this.clientId,
                        client_secret: this.clientSecret,
                        redirect_uri: this.redirectUri,
                        code,
                    }),
                })
            ).json();

            // Redirect user
            return Response.redirect(`${env.FRONTEND_URL}/login?token=${encodeURIComponent(data.access_token)}&expires=${Date.now() + data.expires_in * 1000}&provider=${this.id}`);
        } catch (e) {
            return new Response(JSON.stringify({ error: (e as any).message }), { status: 500 });
        }
    }

    get oauthURL(): string {
        return `${this.url}/api/v2/oauth/authorize?client_id=${this.clientId}&redirect_uri=${this.redirectUri}&response_type=code`;
    }
}

interface AniListResult {
    token_type: string;
    expires_in: number;
    access_token: string;
    refresh_token: string;
}

type MediaList = {
    id: number;
    mediaId: number;
    status: string;
    score: number;
    progress: number;
    progressVolumes: number;
    repeat: number;
    priority: number;
    private: boolean;
    hiddenFromStatusLists: boolean;
    customLists: string[];
    advancedScores: {
        Audio: number;
        Characters: number;
        Enjoyment: number;
        Story: number;
        Visuals: number;
    };
    notes: string;
    updatedAt: number;
    startedAt: {
        year: number;
        month: number;
        day: number;
    };
    completedAt: {
        year: number;
        month: number;
        day: number;
    };
    media: {
        id: number;
        title: {
            userPreferred: string;
            romaji: string;
            english: string;
            native: string;
        };
        coverImage: {
            extraLarge: string;
            large: string;
        };
        type: string;
        format: string;
        status: string;
        episodes: number;
        volumes: number;
        chapters: number;
        averageScore: number;
        popularity: number;
        isAdult: boolean;
        countryOfOrigin: string;
        genres: string[];
        bannerImage: string;
        startDate: {
            year: number;
            month: number;
            day: number;
        };
    };
};

type MediaListEntry = MediaList;

type User = {
    id: number;
    name: string;
    avatar: {
        large: string;
    };
    mediaListOptions: {
        scoreFormat: string;
        rowOrder: string;
        animeList: {
            sectionOrder: string[];
            customLists: string[];
            splitCompletedSectionByFormat: boolean;
            theme: string;
        };
        mangaList: {
            sectionOrder: string[];
            customLists: string[];
            splitCompletedSectionByFormat: boolean;
            theme: string;
        };
    };
};

type MediaListCollection = {
    lists: {
        name: string;
        isCustomList: boolean;
        isCompletedList: boolean;
        entries: MediaListEntry[];
    }[];
    user: User;
};

type AniListData = {
    data: {
        MediaListCollection: MediaListCollection;
    };
};
