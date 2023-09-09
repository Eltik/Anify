import { load } from "cheerio";
import Extractor from "../../../helper/extractor";
import AnimeProvider from ".";
import { Format, StreamingServers, SubType } from "../../../types/enums";
import { Episode, Result, Source } from "../../../types/types";

export default class GogoAnime extends AnimeProvider {
    override rateLimit = 250;
    override id = "gogoanime";
    override url = "https://gogoanimehd.io";

    override formats: Format[] = [Format.MOVIE, Format.ONA, Format.OVA, Format.SPECIAL, Format.TV, Format.TV_SHORT];

    override get subTypes(): SubType[] {
        return [SubType.SUB, SubType.DUB];
    }

    override get headers(): Record<string, string> | undefined {
        return undefined;
    }

    override async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        const request = await this.request(`${this.url}/search.html?keyword=${encodeURIComponent(query)}`);
        if (!request.ok) {
            return [];
        }
        const data = await request.text();
        const results: Result[] = [];

        const $ = load(data);

        $("ul.items > li").map((i, el) => {
            const title = $("p.name a", el).text().trim();
            const id = $(el).find("div.img a").attr("href")!;
            const releasedText = $("p.released", el).text().trim();
            const yearMatch = releasedText.match(/Released:\s+(\d{4})/);
            const year = yearMatch ? parseInt(yearMatch[1]) : 0;
            const img = $(el).find("div.img a img").attr("src")!;

            const format: Format = Format.UNKNOWN;

            results.push({
                id: id,
                title: title,
                altTitles: [],
                img: img,
                format,
                year: year,
                providerId: this.id,
            });
        });

        return results;
    }

    override async fetchEpisodes(id: string): Promise<Episode[] | undefined> {
        const episodes: Episode[] = [];

        const data = await (await this.request(`${this.url}${id}`)).text();

        const $ = load(data);

        const epStart = $("#episode_page > li").first().find("a").attr("ep_start");
        const epEnd = $("#episode_page > li").last().find("a").attr("ep_end");
        const movieId = $("#movie_id").attr("value");
        const alias = $("#alias_anime").attr("value");

        const req = await (await this.request(`https://ajax.gogo-load.com/ajax/load-list-episode?ep_start=${epStart}&ep_end=${epEnd}&id=${movieId}&default_ep=${0}&alias=${alias}`)).text();

        const $$ = load(req);

        $$("#episode_related > li").each((i, el) => {
            episodes?.push({
                id: $(el).find("a").attr("href")?.trim()!,
                number: parseFloat($(el).find(`div.name`).text().replace("EP ", "")),
                title: $(el).find(`div.name`).text(),
                isFiller: false,
                img: null,
                hasDub: id.includes("-dub"),
            });
        });

        return episodes.reverse();
    }

    override async fetchSources(id: string, subType = SubType.SUB, server: StreamingServers = StreamingServers.GogoCDN): Promise<Source | undefined> {
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

        if (id.startsWith("http")) {
            const serverURL = id;
            const download = `https://gogohd.net/download${new URL(serverURL).search}`;

            return await new Extractor(serverURL, result).extract(server ?? StreamingServers.GogoCDN);
        }

        const data = await (await this.request(`${this.url}${id}`)).text();

        const $ = load(data);

        let serverURL: string;

        switch (server) {
            case StreamingServers.GogoCDN:
                serverURL = `${$("#load_anime > div > div > iframe").attr("src")}`;
                break;
            case StreamingServers.VidStreaming:
                serverURL = `${$("div.anime_video_body > div.anime_muti_link > ul > li.vidcdn > a").attr("data-video")}`;
                break;
            case StreamingServers.StreamSB:
                serverURL = $("div.anime_video_body > div.anime_muti_link > ul > li.streamsb > a").attr("data-video")!;
                break;
            default:
                serverURL = `${$("#load_anime > div > div > iframe").attr("src")}`;
                break;
        }

        return await this.fetchSources(serverURL, subType, server ?? StreamingServers.GogoCDN);
    }
}
