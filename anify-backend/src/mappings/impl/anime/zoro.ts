import { load } from "cheerio";
import Extractor from "../../../helper/extractor";
import AnimeProvider from ".";
import { Format, Formats, StreamingServers, SubType } from "../../../types/enums";
import { Episode, Result, Source } from "../../../types/types";

export default class Zoro extends AnimeProvider {
    override rateLimit = 250;
    override id = "zoro";
    //override url = "https://zoro.to";
    override url = "http://aniwatch.to";

    override formats: Format[] = [Format.MOVIE, Format.ONA, Format.OVA, Format.SPECIAL, Format.TV, Format.TV_SHORT];

    override get subTypes(): SubType[] {
        return [SubType.SUB, SubType.DUB];
    }

    override get headers(): Record<string, string> | undefined {
        return undefined;
    }

    override async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        const data = await (await this.request(`${this.url}/search?keyword=${encodeURIComponent(query)}`)).text();
        const results: Result[] = [];

        const $ = load(data);

        $(".film_list-wrap > div.flw-item").map((i, el) => {
            const title = $(el).find("div.film-detail h3.film-name a.dynamic-name").attr("title")!.trim().replace(/\\n/g, "");
            const id = $(el).find("div:nth-child(1) > a").last().attr("href")!;
            const img = $(el).find("img").attr("data-src")!;

            const altTitles: string[] = [];
            const jpName = $(el).find("div.film-detail h3.film-name a.dynamic-name").attr("data-jname")!.trim().replace(/\\n/g, "");
            altTitles.push(jpName);

            const formatString: string = $(el).find("div.film-detail div.fd-infor span.fdi-item")?.first()?.text().toUpperCase();
            const format: Format = Formats.includes(formatString as Format) ? (formatString as Format) : Format.UNKNOWN;

            results.push({
                id: id,
                title: title,
                altTitles: altTitles,
                year: 0,
                format,
                img: img,
                providerId: this.id,
            });
        });

        return results;
    }

    override async fetchEpisodes(id: string): Promise<Episode[] | undefined> {
        const episodes: Episode[] = [];

        const data = await (
            await this.request(`${this.url}/ajax/v2/episode/list/${id.split("-").pop()}`, {
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    Referer: `${this.url}/watch/${id}`,
                },
            })
        ).json();

        const $ = load(data.html);

        const hasDubCheck = await (await this.request(`${this.url}/watch${id}`)).text();
        const $$ = load(hasDubCheck);

        const subDub = $$("div.film-stats div.tick-dub")
            .toArray()
            .map((value) => $$(value).text().toLowerCase());
        const dubCount = subDub.length >= 1 ? parseInt(subDub[0]) : false;

        $("div.detail-infor-content > div > a").map((i, el) => {
            const number = parseInt($(el).attr("data-number")!);
            const title = $(el).attr("title")!;
            const id = $(el).attr("href")!;
            const isFiller = $(el).hasClass("ssl-item-filler")!;

            episodes.push({
                id,
                isFiller,
                number,
                title,
                img: null,
                hasDub: dubCount ? number <= dubCount : false,
            });
        });

        return episodes;
    }

    override async fetchSources(id: string, subType: SubType = SubType.SUB, server: StreamingServers = StreamingServers.VidCloud): Promise<Source | undefined> {
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

            return await new Extractor(serverURL, result).extract(server ?? StreamingServers.VidCloud);
        }

        const data = await (await this.request(`${this.url}/ajax/v2/episode/servers?episodeId=${id.split("?ep=")[1]}`)).json();
        const $ = load(data.html);

        /**
         * vidtreaming -> 4
         * rapidcloud  -> 1
         * streamsb -> 5
         * streamtape -> 3
         */
        let serverId;
        switch (server) {
            case StreamingServers.VidCloud:
                serverId = this.retrieveServerId($, 4, subType);

                if (!serverId) throw new Error("RapidCloud not found");
                break;
            case StreamingServers.VidStreaming:
                serverId = this.retrieveServerId($, 4, subType);

                if (!serverId) throw new Error("VidStreaming not found");
                break;
            case StreamingServers.StreamSB:
                serverId = this.retrieveServerId($, 5, subType);

                if (!serverId) throw new Error("StreamSB not found");
                break;
            case StreamingServers.StreamTape:
                serverId = this.retrieveServerId($, 3, subType);

                if (!serverId) throw new Error("StreamTape not found");
                break;
            default:
                serverId = this.retrieveServerId($, 4, subType);

                if (!serverId) throw new Error("RapidCloud not found");
                break;
        }

        const req = await (await this.request(`${this.url}/ajax/v2/episode/sources?id=${serverId}`)).json();
        return await this.fetchSources(req.link, subType, server ?? StreamingServers.VidCloud);
    }

    private retrieveServerId($: any, index: number, subOrDub: SubType) {
        return $(`div.ps_-block.ps_-block-sub.servers-${subOrDub} > div.ps__-list > div`)
            .map((i: any, el: any) => ($(el).attr("data-server-id") === `${index}` ? $(el) : null))
            .get()[0]
            ?.attr("data-id")!;
    }
}
