import AnimeProvider from ".";
import { load } from "cheerio";
import Extractor from "../../../helper/extractor";
import { Format, Formats, StreamingServers, SubType } from "../../../types/enums";
import { Episode, Result, Source } from "../../../types/types";

/**
 * @description: For some reason, proxy scraping doesn't work with AnimePahe. I got it working with some proxies stolen from baseProxies.json, but obviously those aren't tested with AnimePahe specifically. TLDR, someone please fix proxy scraping for AnimePahe then it should work. 3/15/2024
 */

export default class AnimePahe extends AnimeProvider {
    override rateLimit = 250;
    override id = "animepahe";
    override url = "https://animepahe.com";

    public needsProxy: boolean = true;
    public useGoogleTranslate: boolean = false;

    override formats: Format[] = [Format.MOVIE, Format.ONA, Format.OVA, Format.SPECIAL, Format.TV, Format.TV_SHORT];

    override get subTypes(): SubType[] {
        return [SubType.SUB];
    }

    override get headers(): Record<string, string> | undefined {
        return { Referer: "https://kwik.si" };
    }

    override async search(query: string): Promise<Result[] | undefined> {
        const request = await this.request(`${this.url}/api?m=search&q=${encodeURIComponent(query)}`, {
            headers: {
                Cookie: "__ddg1_=;__ddg2_=;",
            },
        });

        if (!request.ok) {
            return [];
        }
        const data = (await request.json()) as { data: { id: number; title: string; year: number; poster: string; type: string; session: string }[] };
        const results: Result[] = [];

        if (!data?.data) {
            return [];
        }

        data.data.map((item: { id: number; title: string; year: number; poster: string; type: string; session: string }) => {
            const formatString: string = item.type.toUpperCase();
            const f: Format = Formats.includes(formatString as Format) ? (formatString as Format) : Format.UNKNOWN;

            results.push({
                id: String(item.id) ?? item.session,
                title: item.title,
                year: item.year,
                img: item.poster,
                format: f,
                altTitles: [],
                providerId: this.id,
            });
        });

        return results;
    }

    override async fetchEpisodes(id: string): Promise<Episode[] | undefined> {
        const episodes: Episode[] = [];

        const req = await (
            await this.request(
                `${this.url}${id.includes("-") ? `/anime/${id}` : `/a/${id}`}`,
                {
                    headers: {
                        Cookie: "__ddg1_=;__ddg2_=;",
                    },
                },
                false,
            )
        ).text();

        const $ = load(req);

        const tempId = $("head > meta[property='og:url']").attr("content")!.split("/").pop()!;

        const { last_page, data } = (await (
            await this.request(`${this.url}/api?m=release&id=${tempId}&sort=episode_asc&page=1`, {
                headers: {
                    Cookie: "__ddg1_=;__ddg2_=;",
                },
            })
        ).json()) as { last_page: number; data: { id: number; episode: number; title: string; snapshot: string; filler: number; created_at?: string }[] };

        data.map((item: { id: number; episode: number; title: string; snapshot: string; filler: number; created_at?: string }) => {
            const updatedAt = new Date(item.created_at ?? Date.now()).getTime();

            episodes.push({
                id: item.id + "-" + id,
                number: item.episode,
                title: item.title && item.title.length > 0 ? item.title : "Episode " + item.episode,
                img: item.snapshot,
                isFiller: item.filler === 1,
                hasDub: false,
                description: null,
                rating: null,
                updatedAt,
            });
        });

        const pageNumbers = Array.from({ length: last_page - 1 }, (_, i) => i + 2);

        const promises = pageNumbers.map((pageNumber) =>
            this.request(`${this.url}/api?m=release&id=${tempId}&sort=episode_asc&page=${pageNumber}`, {
                headers: {
                    Cookie: "__ddg1_=;__ddg2_=;",
                },
            }).then((res) => res.json()),
        );
        const results = (await Promise.all(promises)) as {
            data: { id: number; episode: number; title: string; snapshot: string; filler: number; created_at?: string }[];
        }[];

        results.forEach((showData) => {
            for (const data of showData.data) {
                if (data) {
                    const updatedAt = new Date(data.created_at ?? Date.now()).getTime();

                    episodes.push({
                        id: data.id + "-" + id,
                        number: data.episode,
                        title: data.title && data.title.length > 0 ? data.title : "Episode " + data.episode,
                        img: data.snapshot,
                        isFiller: data.filler === 1,
                        hasDub: false,
                        description: null,
                        rating: null,
                        updatedAt,
                    });
                }
            }
        });
        (data as any[]).sort((a, b) => a.number - b.number);
        return episodes;
    }

    override async fetchSources(id: string, subType?: SubType, server: StreamingServers = StreamingServers.Kwik): Promise<Source | undefined> {
        const animeId = id.split("-").pop()!;
        const episodeId = id.split("-")[0];

        const req = await this.request(
            `${this.url}${animeId.includes("-") ? `/anime/${animeId}` : `/a/${animeId}`}`,
            {
                headers: {
                    Cookie: "__ddg1_=;__ddg2_=;",
                },
            },
            false,
        );

        try {
            const url = req.url;
            // Need session id to fetch the watch page
            const sessionId = url.split("/anime/").pop()?.split("?")[0] ?? "";

            const $ = load(await req.text());
            const tempId = $("head > meta[property='og:url']").attr("content")!.split("/").pop()!;
            const { last_page, data } = (await (
                await this.request(
                    `${this.url}/api?m=release&id=${tempId}&sort=episode_asc&page=1`,
                    {
                        headers: {
                            Cookie: "__ddg1_=;__ddg2_=;",
                        },
                    },
                    false,
                )
            ).json()) as { last_page: number; data: { id: number; session: string }[] };

            let episodeSession = "";

            for (let i = 0; i < data.length; i++) {
                if (String(data[i].id) === episodeId) {
                    episodeSession = data[i].session;
                    break;
                }
            }

            if (episodeSession === "") {
                for (let i = 1; i < last_page; i++) {
                    const data = (await (
                        await this.request(`${this.url}/api?m=release&id=${tempId}&sort=episode_asc&page=${i + 1}`, {
                            headers: {
                                Cookie: "__ddg1_=;__ddg2_=;",
                            },
                        })
                    ).json()) as { last_page: number; data: { id: number; session: string }[] }["data"];

                    for (let j = 0; j < data.length; j++) {
                        if (String(data[j].id) === episodeId) {
                            episodeSession = data[j].session;
                            break;
                        }
                    }

                    if (episodeSession !== "") break;
                }
            }

            if (episodeSession === "") return undefined;

            const watchReq = await (
                await this.request(
                    `${this.url}/play/${sessionId}/${episodeSession}`,
                    {
                        headers: {
                            Cookie: "__ddg1_=;__ddg2_=;",
                        },
                    },
                    false,
                )
            ).text();

            const regex = /https:\/\/kwik\.si\/e\/\w+/g;
            const matches = watchReq.match(regex);

            if (matches === null) return undefined;

            const result: Source = {
                sources: [],
                subtitles: [],
                audio: [],
                intro: {
                    start: 0,
                    end: 0,
                },
                outro: {
                    start: 0,
                    end: 0,
                },
                headers: this.headers ?? {},
            };

            return await new Extractor(matches[0], result).extract(server ?? StreamingServers.Kwik);
        } catch (e) {
            console.error(e);
            return undefined;
        }
    }
}
