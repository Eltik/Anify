import AnimeProvider from ".";
import { load } from "cheerio";
import Extractor from "../../../helper/extractor";
import { Format, Formats, StreamingServers, SubType } from "../../../types/enums";
import { Episode, Result, Source } from "../../../types/types";

export default class AnimePahe extends AnimeProvider {
    override rateLimit = 250;
    override id = "animepahe";
    override url = "https://animepahe.com";

    override formats: Format[] = [Format.MOVIE, Format.ONA, Format.OVA, Format.SPECIAL, Format.TV, Format.TV_SHORT];

    override get subTypes(): SubType[] {
        return [SubType.SUB];
    }

    override get headers(): Record<string, string> | undefined {
        return { Referer: "https://kwik.cx" };
    }

    override async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        const request = await this.request(`${this.url}/api?m=search&q=${encodeURIComponent(query)}`);
        if (!request.ok) {
            return [];
        }
        const data = await request.json();
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

        const req = await (await this.request(`${this.url}${id.includes("-") ? `/anime/${id}` : `/a/${id}`}`)).text();

        const $ = load(req);

        const tempId = $("head > meta[property='og:url']").attr("content")!.split("/").pop()!;
        const { last_page, data } = await (await this.request(`${this.url}/api?m=release&id=${tempId}&sort=episode_asc&page=1`)).json();

        data.map((item: { id: number; episode: number; title: string; snapshot: string; filler: number; created_at?: string }) => {
            const updatedAt = new Date(item.created_at ?? Date.now()).getTime();

            episodes.push({
                id: item.id + "-" + id,
                number: item.episode,
                title: item.title && item.title.length > 0 ? item.title : "Episode " + item.episode,
                img: item.snapshot,
                isFiller: item.filler === 1,
                hasDub: false,
                updatedAt,
            });
        });

        const pageNumbers = Array.from({ length: last_page - 1 }, (_, i) => i + 2);

        const promises = pageNumbers.map((pageNumber) => this.request(`${this.url}/api?m=release&id=${tempId}&sort=episode_asc&page=${pageNumber}`).then((res) => res.json()));
        const results = await Promise.all(promises);

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
                        updatedAt,
                    });
                }
            }
        });
        (data as any[]).sort((a, b) => a.number - b.number);
        return episodes;
    }

    override async fetchSources(id: string, subType: SubType = SubType.SUB, server: StreamingServers = StreamingServers.Kwik): Promise<Source | undefined> {
        const animeId = id.split("-").pop()!;
        const episodeId = id.split("-")[0];

        const req = await this.request(`${this.url}${animeId.includes("-") ? `/anime/${animeId}` : `/a/${animeId}`}`);

        try {
            const url = req.url;
            // Need session id to fetch the watch page
            const sessionId = url.split("/anime/").pop()!;

            const $ = load(await req.text());
            const tempId = $("head > meta[property='og:url']").attr("content")!.split("/").pop()!;
            const { last_page, data } = await (await this.request(`${this.url}/api?m=release&id=${tempId}&sort=episode_asc&page=1`)).json();

            let episodeSession = "";

            for (let i = 0; i < data.length; i++) {
                if (String(data[i].id) === episodeId) {
                    episodeSession = data[i].session;
                    break;
                }
            }

            if (episodeSession === "") {
                for (let i = 1; i < last_page; i++) {
                    const data = await (await this.request(`${this.url}/api?m=release&id=${tempId}&sort=episode_asc&page=${i + 1}`)).json();

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

            const watchReq = await (await this.request(`${this.url}/play/${sessionId}/${episodeSession}`)).text();

            const regex = /https:\/\/kwik\.cx\/e\/\w+/g;
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
