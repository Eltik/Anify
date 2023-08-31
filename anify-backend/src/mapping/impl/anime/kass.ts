import AnimeProvider, { Episode, Server, Source, StreamingServers, SubType } from ".";
import { Format, Formats, Result } from "../..";
import Extractor from "@/src/helper/extractor";

export default class Kass extends AnimeProvider {
    override rateLimit = 250;
    override id = "kass";
    override url = "https://kickassanime.am";

    override formats: Format[] = [Format.MOVIE, Format.ONA, Format.OVA, Format.SPECIAL, Format.TV, Format.TV_SHORT];

    override get subTypes(): SubType[] {
        return [SubType.SUB, SubType.DUB];
    }

    override get headers(): Record<string, string> | undefined {
        return { Origin: "https://vidnethub.net" };
    }

    override async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        const request = await this.request(
            `${this.url}/api/search`,
            {
                method: "POST",
                body: JSON.stringify({
                    query,
                }),
                headers: {
                    "Content-type": "application/json",
                    Referer: `${this.url}/`,
                    Origin: this.url,
                },
            },
            true
        );

        if (!request.ok) {
            return [];
        }
        const data: SearchData[] = await request.json();

        const results: Result[] = [];

        data.forEach((item) => {
            results.push({
                id: item.slug,
                altTitles: item.title_en ? [item.title_en, item.title] : [item.title],
                title: item.title_en ?? item.title,
                format: Formats.includes(item.type as Format) ? (item.type as Format) : Format.UNKNOWN,
                img: `${this.url}/image/poster/${item.poster.hq ?? item.poster.sm}.${item.poster.formats.includes("webp") ? "webp" : item.poster.formats[0]}`,
                year: item.year,
                providerId: this.id,
            });
        });

        return results;
    }

    override async fetchEpisodes(id: string): Promise<Episode[] | undefined> {
        const episodeJSONs: { sub?: Episodes; dub?: Episodes } = { dub: undefined, sub: undefined };

        try {
            episodeJSONs.sub = await (await this.request(`${this.url}/api/show/${id}/episodes?lang=ja-JP`, {}, true)).json();

            try {
                const promises: Promise<Response>[] = [];

                for (let i = 0; i < (episodeJSONs["sub"]?.pages ?? []).length; i++) {
                    if (i == 0) {
                        continue;
                    }

                    promises.push(this.request(`${this.url}/api/show/${id}/episodes?lang=ja-JP&page=${episodeJSONs["sub"]?.pages[i].number}`, {}, true));
                }

                const results = await Promise.all(promises);

                for (const result of results) {
                    try {
                        const data = await result.json();
                        episodeJSONs["sub"]?.result.push(...data.result);
                    } catch (err) {
                        console.warn(err);
                    }
                }
            } catch (err) {
                console.warn(err);
            }
        } catch (err) {
            episodeJSONs.dub = await (await this.request(`${this.url}/api/show/${id}/episodes?lang=en-US`, {}, true)).json();

            try {
                const promises: Promise<Response>[] = [];

                for (let i = 0; i < (episodeJSONs["dub"]?.pages ?? []).length; i++) {
                    if (i == 0) {
                        continue;
                    }

                    promises.push(this.request(`${this.url}/api/show/${id}/episodes?lang=en-US&page=${episodeJSONs["dub"]?.pages[i].number}`, {}, true));
                }

                const results = await Promise.all(promises);

                for (const result of results) {
                    try {
                        const data = await result.json();
                        episodeJSONs["dub"]?.result.push(...data.result);
                    } catch (err) {
                        console.warn(err);
                    }
                }
            } catch (err) {
                console.warn(err);
            }
        }

        if (!episodeJSONs.dub) {
            episodeJSONs.dub = await (await this.request(`${this.url}/api/show/${id}/episodes?lang=en-US`, {}, true)).json();

            try {
                const promises: Promise<Response>[] = [];

                for (let i = 0; i < (episodeJSONs["dub"]?.pages ?? []).length; i++) {
                    if (i == 0) {
                        continue;
                    }

                    promises.push(this.request(`${this.url}/api/show/${id}/episodes?lang=en-US&page=${episodeJSONs["dub"]?.pages[i].number}`, {}, true));
                }

                const results = await Promise.all(promises);

                for (const result of results) {
                    try {
                        const data = await result.json();
                        episodeJSONs["dub"]?.result.push(...data.result);
                    } catch (err) {
                        console.warn(err);
                    }
                }
            } catch (err) {
                console.warn(err);
            }
        }

        if (episodeJSONs.sub?.pages?.length === 0) {
            episodeJSONs.sub = undefined;
        }

        if (episodeJSONs.dub?.pages?.length === 0) {
            episodeJSONs.dub = undefined;
        }

        const episodeJSON = episodeJSONs.sub ?? episodeJSONs.dub;
        const dubData = {};

        if (episodeJSONs.sub && episodeJSONs.dub) {
            for (let i = 0; i < episodeJSONs.dub?.result?.length; i++) {
                const el = episodeJSONs.dub.result[i];
                let epNum = el.episode_number;

                if (epNum == 0) {
                    epNum = 0.1;
                }

                dubData[epNum] = el;
            }
        }

        const episodes: Episode[] = [];

        for (let i = 0; i < (episodeJSON?.result ?? []).length; i++) {
            const el = episodeJSON?.result[i];
            const isSub = episodeJSON === episodeJSONs.sub;

            let epNum = el?.episode_number ?? -1;

            if (epNum == 0) {
                epNum = 0.1;
            }

            const sourceID = {};

            sourceID[isSub ? "sub" : "dub"] = `ep-${el?.episode_string}-${el?.slug}`;

            if (dubData[epNum] && isSub) {
                sourceID["dub"] = `ep-${dubData[epNum].episode_string}-${dubData[epNum].slug}`;
            }

            episodes.push({
                id: JSON.stringify({
                    id,
                    epNum,
                    sourceID: JSON.stringify(sourceID),
                }),
                title: `Episode ${epNum}${el?.title ? ` - ${el.title}` : ""}`,
                number: epNum,
                img: `${this.url}/image/thumbnail/${el?.thumbnail?.sm ?? el?.thumbnail?.sm}.${el?.thumbnail?.formats.includes("webp") ? "webp" : el?.thumbnail?.formats[0]}`,
                hasDub: !!dubData[epNum],
                isFiller: false,
            });
        }

        return episodes;
    }

    override async fetchSources(id: string, subType: SubType | undefined, server: StreamingServers = StreamingServers.BirdStream): Promise<Source | undefined> {
        const source: Source = {
            sources: [],
            subtitles: [],
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

        const servers = await this.fetchServers(id);

        let s = servers?.filter((s) => s.name === server.toString() && s.type === subType)[0];

        if (!s) {
            switch (server) {
                case StreamingServers.DuckStream:
                    s = servers?.filter((s) => s.name === StreamingServers.BirdStream.toString() && s.type === subType)[0];
                    server = StreamingServers.BirdStream;
                    break;
                case StreamingServers.BirdStream:
                    s = servers?.filter((s) => s.name === StreamingServers.DuckStream.toString() && s.type === subType)[0];
                    server = StreamingServers.DuckStream;
                    break;
                case StreamingServers.DuckStreamV2:
                    s = servers?.filter((s) => s.name === StreamingServers.DuckStream.toString() && s.type === subType)[0];
                    server = StreamingServers.DuckStream;
                    break;
                default:
                    break;
            }

            if (!s) {
                s = servers?.filter((s) => s.name === StreamingServers.DuckStreamV2.toString() && s.type === subType)[0];
                server = StreamingServers.DuckStreamV2;
            }

            if (!s) return undefined;
        }

        return await new Extractor(s.url, source).extract(server);
    }

    override async fetchServers(id: string): Promise<Server[] | undefined> {
        const params = JSON.parse(id);
        id = params.id;

        const links = JSON.parse(params.sourceID);

        const server: Server[] = [];

        for (const type in links) {
            const slug = links[type];
            const videoJSON = await (await this.request(`${this.url}/api/show/${id}/episode/${slug}`, {}, true)).json();
            const servers = videoJSON.servers;

            for (const s of servers) {
                if (s.name?.toLowerCase() === "vidstreaming") s.name = StreamingServers.DuckStreamV2.toString();

                server.push({
                    name: s.name?.toLowerCase(),
                    url: s.src,
                    type: type === "sub" ? SubType.SUB : SubType.DUB,
                });
            }
        }

        return server;
    }
}

interface SearchData {
    rating: string;
    slug: string;
    start_date: string;
    status: string;
    title: string;
    title_en: string;
    type: string;
    year: number;
    poster: {
        formats: string[];
        sm: string;
        aspectRatio: number;
        hq: string;
    };
}

interface Episodes {
    current_page: number;
    pages: { number: number; from: string; to: string; eps: (string | number)[] }[];
    result: {
        slug: string;
        title?: string;
        duration_ms?: number;
        episode_number: number;
        episode_string: string;
        thumbnail?: {
            formats: string[];
            sm: string;
            aspectRatio: number;
            hq: string;
        };
    }[];
}
