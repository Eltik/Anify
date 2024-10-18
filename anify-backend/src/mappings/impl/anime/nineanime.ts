import { load } from "cheerio";
import AnimeProvider from ".";
import { Format, Formats, StreamingServers, SubType } from "../../../types/enums";
import { Episode, Result, Server, Source } from "../../../types/types";
import Extractor from "../../../helper/extractor";
import { rc4Cypher, serializeText } from "../../../helper";

export default class NineAnime extends AnimeProvider {
    override rateLimit = 250;
    override id = "9anime";
    override url = "https://aniwave.to";
    override formats: Format[] = [Format.MOVIE, Format.ONA, Format.OVA, Format.SPECIAL, Format.TV, Format.TV_SHORT];

    public needsProxy: boolean = true;
    public overrideProxy: boolean = true;

    override get subTypes(): SubType[] {
        return [SubType.SUB, SubType.DUB];
    }

    override get headers(): Record<string, string> | undefined {
        return { Referer: "https://vidplay.site/", "X-Requested-With": "XMLHttpRequest" };
    }

    override async search(query: string): Promise<Result[] | undefined> {
        const data = (await (await this.request(`${this.url}/ajax/anime/search?keyword=${encodeURIComponent(query)}`)).json()) as { result: { html: string } };
        const $ = load(data.result.html);

        const results: Result[] = $("div.items > a.item")
            .map((i, el) => {
                const title = $(el).find("div.name");
                const altTitles: string[] = [title.attr("data-jp")!];

                const year = parseInt($(el).find("div.info div.meta span.dot").last()?.text()?.trim()?.split(",")[1]) || 0;

                const formatString = $(el).find("div.info div.meta span.dot").eq(-2)?.text()?.trim();
                const format: Format = Formats.includes(formatString as Format) ? (formatString as Format) : Format.UNKNOWN;

                return {
                    id: $(el).attr("href")!,
                    title: title.text().trim(),
                    altTitles,
                    year,
                    format,
                    img: $(el).find("img").attr("src")!,
                    providerId: this.id,
                };
            })
            .get();

        return results;
    }

    override async fetchEpisodes(id: string): Promise<Episode[] | undefined> {
        const data = await (await this.request(`${this.url}${id}`)).text();

        const $ = load(data);

        const nineId = $("#watch-main").attr("data-id")!;

        const req = await this.request(`${this.url}/ajax/episode/list/${nineId}?vrf=${this.getVrf(parseInt(nineId).toString())}`);

        const $$ = load(((await req.json()) as { result: string }).result);

        const episodes: Episode[] = [];

        for (const el of $$("div.episodes > ul > li")) {
            const liTitle = $(el).attr("title")?.split(" - ")?.[0]?.split("Release: ")[1] ?? new Date().toDateString();

            const updatedAt = new Date(liTitle).getTime();

            const episode: Episode = {
                //id: ids[0], <- if i only want sub
                id: $$(el).find("a").attr("data-ids")!,
                number: parseInt($$(el).find("a").attr("data-num")?.toString() ?? "0"),
                title: $$(el).find("span").text()?.length > 0 ? $$(el).find("span").text() : "Episode " + $$(el).find("a").attr("data-num"),
                isFiller: $$(el).find("a").hasClass("filler"),
                img: null,
                hasDub: $$(el).find("a").attr("data-dub")?.toString() === "1",
                description: null,
                rating: null,
                updatedAt,
            };

            episodes.push(episode);
        }

        return episodes;
    }

    override async fetchSources(id: string, subType: SubType = SubType.SUB, server: StreamingServers = StreamingServers.Vidstream): Promise<Source | undefined> {
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

        const servers = await this.fetchServers(id, subType);
        if (!servers) return undefined;

        let s = servers.find((s) => s.name === server);

        switch (server) {
            case StreamingServers.Vidstream:
                s = servers.find((s) => s.name === "vidstream")!;
                if (!s) throw new Error("Vidstream server found");
                break;
            case StreamingServers.MegaF:
                s = servers.find((s) => s.name === "megaf")!;
                if (!s) throw new Error("MegaF server found");
                break;
            case StreamingServers.StreamTape:
                s = servers.find((s) => s.name === "streamtape");
                if (!s) throw new Error("Streamtape server found");
                break;
            case StreamingServers.MyCloud:
                s = servers.find((s) => s.name === "mycloud");
                if (!s) throw new Error("Mycloud server found");
                break;
            case StreamingServers.Filemoon:
                s = servers.find((s) => s.name === "filemoon");
                if (!s) throw new Error("Filemoon server found");
                break;
            default:
                s = servers.find((s) => s.name === "vidstream")!;
                if (!s) throw new Error("Vidstream server found");
                break;
        }

        const serverId = s.url;
        const vrf = await this.getVrf(serverId);

        return await new Extractor(`${this.url}/ajax/server/${serverId}?vrf=${vrf}`, result).extract(server);
    }

    override async fetchServers(id: string, subType: SubType): Promise<Server[] | undefined> {
        let data: any = {};

        try {
            const newId = subType === SubType.DUB ? id.split(",")[id.split(",").length - 1] : id.split(",")[1] ?? id.split(",")[0];

            const vrf = await this.getVrf(newId);
            const url = `${this.url}/ajax/server/list/${newId}?vrf=${vrf}`;

            const json = (await (await this.request(url)).json()) as { result: string };

            const $ = load(json.result);

            const sub = $("div.servers div.type").attr("data-type");

            if ((sub === "softsub" || sub === "sub") && subType === SubType.SUB) {
                data = json;
            } else if (sub === "dub" && subType === SubType.DUB) {
                data = json;
            } else return [];
        } catch (e) {
            console.error(e);
            return [];
        }

        const $ = load(data.result);

        const servers: Server[] = [];

        $(".type > ul > li").each((i, el) => {
            const serverId = $(el).attr("data-link-id")!;

            servers.push({
                name: $(el).text().toLowerCase(),
                url: serverId,
            });
        });
        return servers;
    }

    private getVrf(input: string) {
        const idToVrf = (t: string) => {
            t = encodeURIComponent(t);

            return (function (t) {
                return t;
            })(serializeText(rc4Cypher("p01EDKu734HJP1Tm", t)));
        };

        return encodeURIComponent(idToVrf(input));
    }
}
