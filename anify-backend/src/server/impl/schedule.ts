import { cacheTime, redis } from "..";
import { Anime } from "../../types/types";
import { get } from "../../database/impl/modify/get";

export const handler = async (req: Request): Promise<Response> => {
    try {
        const url = new URL(req.url);
        const paths = url.pathname.split("/");
        paths.shift();

        const validTypes = ["anime", "manga", "novel"];

        const body =
            req.method === "POST"
                ? await req.json().catch(() => {
                      return null;
                  })
                : null;

        const type = body?.type ?? paths[1] ?? url.searchParams.get("type") ?? "anime";
        if (!validTypes.includes(type.toLowerCase())) {
            return new Response(JSON.stringify({ error: "Invalid type provided." }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const cached = await redis.get(`schedule:${type}`);
        if (cached) {
            return new Response(cached, {
                status: 200,
                headers: { "Content-Type": "application/json" },
            });
        }

        const schedule = await fetchSchedule(type);

        const results: Anime[] = [];

        for (const show of schedule) {
            const possible = await get(String(show.media.id));
            if (possible) {
                (possible as any).airingEpisode = show.episode;
                (possible as any).airingAt = show.airingAt * 1000;

                results.push(possible as Anime);
            }
        }

        const formattedResponse: Schedule | undefined = results.reduce(
            (acc: any, anime) => {
                const day = new Date((anime as any).airingAt).getDay();

                switch (day) {
                    case 0:
                        acc.sundaySchedule.push(anime);
                        break;
                    case 1:
                        acc.mondaySchedule.push(anime);
                        break;
                    case 2:
                        acc.tuesdaySchedule.push(anime);
                        break;
                    case 3:
                        acc.wednesdaySchedule.push(anime);
                        break;
                    case 4:
                        acc.thursdaySchedule.push(anime);
                        break;
                    case 5:
                        acc.fridaySchedule.push(anime);
                        break;
                    case 6:
                        acc.saturdaySchedule.push(anime);
                        break;
                }

                return acc;
            },
            {
                sundaySchedule: [],
                mondaySchedule: [],
                tuesdaySchedule: [],
                wednesdaySchedule: [],
                thursdaySchedule: [],
                fridaySchedule: [],
                saturdaySchedule: [],
            },
        );

        await redis.set(`schedule:${type}`, JSON.stringify(formattedResponse), "EX", cacheTime);

        return new Response(JSON.stringify(formattedResponse), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    } catch (e) {
        console.error(e);
        return new Response(JSON.stringify({ error: "An error occurred." }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};

const route = {
    path: "/schedule",
    handler,
};

export default route;

// TODO: Implement this
async function fetchSchedule(type: string) {
    const currentDate = new Date(); // Get the current date

    const fetchData = async (page = 1) => {
        // Calculate the start date of the week (assuming Monday as the first day of the week)
        const weekStart = new Date(currentDate);
        weekStart.setDate(currentDate.getDate() - currentDate.getDay() + 1); // Set to Monday

        // Calculate the end date of the week (assuming Sunday as the last day of the week)
        const weekEnd = new Date(currentDate);
        weekEnd.setDate(currentDate.getDate() - currentDate.getDay() + 8); // Set to next Monday

        const aniListArgs = {
            query: `
            query(
                $weekStart: Int,
                $weekEnd: Int,
                $page: Int
            ) {
                Page(page: $page) {
                    pageInfo {
                        hasNextPage
                        total
                    }
                    airingSchedules(
                        airingAt_greater: $weekStart airingAt_lesser: $weekEnd
                    ) {
                        id
                        episode
                        airingAt
                        media {
            
                            id
                            idMal
                            title {
                                romaji
                                native
                                english
                            }
                            startDate {
                                year
                                month
                                day
                            }
                            endDate {
                                year
                                month
                                day
                            }
                            status
                            season
                            format
                            genres
                            synonyms
                            duration
                            popularity
                            episodes
                            source(version: 2)
                            countryOfOrigin
                            hashtag
                            averageScore
                            siteUrl
                            description
                            bannerImage
                            isAdult
                            coverImage {
                                extraLarge
                                color
                            }
                            trailer {
                                id
                                site
                                thumbnail
                            }
                            externalLinks {
                                site
                                url
                            }
                            rankings {
                                rank
                                type
                                season
                                allTime
                            }
                            studios(isMain: true) {
                                nodes {
                                    id
                                    name
                                    siteUrl
                                }
                            }
                            relations {
                                edges {
                                    relationType(version: 2)
                                    node {
                                        id
                                        title {
                                            romaji
                                            native
                                            english
                                        }
                                        siteUrl
                                    }
                                }
                            }
                        }
                    }
                }
            }
            `,
            variables: {
                weekStart: Math.round(weekStart.getTime() / 1000),
                weekEnd: Math.round(weekEnd.getTime() / 1000),
                page,
            },
        };

        const req = await (
            await fetch("https://graphql.anilist.co", {
                body: JSON.stringify(aniListArgs),
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Origin: "https://anilist.co",
                },
            })
        ).json();

        const schedule: Schedule[] = req?.data.Page.airingSchedules;

        return schedule;
    };

    const pages = [1, 2, 3, 4, 5, 6, 7];
    const fetchDataPromises = pages.map(fetchData);

    const results = await Promise.all(fetchDataPromises);
    const schedule = results.flat();

    return schedule;
}

interface Schedule {
    id: number;
    episode: number;
    airingAt: number;
    media: {
        id: number;
        idMal: number;
        title: {
            romaji: string;
            native: string;
            english: string | null;
        };
        startDate: {
            year: number;
            month: number;
            day: number;
        };
        endDate: {
            year: number;
            month: number;
            day: number;
        };
        status: string;
        season: string | null;
        format: string;
        genres: string[];
        synonyms: string[];
        duration: number | null;
        popularity: number;
        episodes: number;
        source: string;
        countryOfOrigin: string;
        hashtag: string | null;
        averageScore: number | null;
        siteUrl: string;
        description: string | null;
        bannerImage: string | null;
        isAdult: boolean;
        coverImage: {
            extraLarge: string;
            color: string;
        };
        trailer: string | null;
        externalLinks: {
            site: string;
            url: string;
        }[];
        rankings: any[];
        studios: {
            nodes: {
                id: number;
                name: string;
                siteUrl: string;
            }[];
        };
        relations: {
            edges: any[];
        };
    };
}
