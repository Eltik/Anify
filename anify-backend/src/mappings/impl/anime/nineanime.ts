import AnimeProvider from ".";
import { Episode, Result, Server, Source } from "../../../types/types";
import { load } from "cheerio";

import { env } from "../../../env";
import { Format, Formats, StreamingServers, SubType } from "../../../types/enums";
import Extractor from "../../../helper/extractor";

export default class NineAnime extends AnimeProvider {
    override rateLimit = 250;
    override id = "9anime";
    override url = "https://aniwave.ws";
    override formats: Format[] = [Format.MOVIE, Format.ONA, Format.OVA, Format.SPECIAL, Format.TV, Format.TV_SHORT];

    private resolver: string | undefined = env.NINEANIME_RESOLVER;
    private resolverKey: string | undefined = env.NINEANIME_KEY || `9anime`;

    public needsProxy: boolean = true;
    public overrideProxy: boolean = true;

    override get subTypes(): SubType[] {
        return [SubType.SUB, SubType.DUB];
    }

    override get headers(): Record<string, string> | undefined {
        return { Referer: "https://vidplay.site/", "X-Requested-With": "XMLHttpRequest" };
    }

    override async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        const vrf = await this.getSearchVRF(query);
        const data = (await (await this.request(`${this.url}/ajax/anime/search?keyword=${encodeURIComponent(query)}&${vrf.vrfQuery}=${encodeURIComponent(vrf.url)}`)).json()) as { result: { html: string } };

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

        const vrf = await this.getVRF(nineId);

        const req = await this.request(`${this.url}/ajax/episode/list/${nineId}?${vrf.vrfQuery}=${encodeURIComponent(vrf.url)}`);

        const $$ = load(((await req.json()) as { result: string }).result);

        const episodes: Episode[] = [];

        for (const el of $$("div.episodes > ul > li")) {
            const liTitle = $(el).attr("title")?.split(" - ")?.[0]?.split("Release: ")[1] ?? new Date().toDateString();

            const updatedAt = new Date(liTitle).getTime();

            const episode: Episode = {
                //id: ids[0], <- if i only want sub
                id: $$(el).find("a").attr("data-ids")!,
                number: parseInt($$(el).find("a").attr("data-num")?.toString()!),
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

    override async fetchSources(id: string, subType: SubType = SubType.SUB, server: StreamingServers = StreamingServers.VizCloud): Promise<Source | undefined> {
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
            case StreamingServers.VizCloud:
                s = servers.find((s) => s.name === "vidplay")!;
                if (!s) throw new Error("Vidplay server found");
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
        const vrf = await this.getVRF(serverId);

        let serverData;
        try {
            this.useGoogleTranslate = false;
            const temp = await (await this.request(`${this.url}/ajax/server/${serverId}?${vrf.vrfQuery}=${vrf.url}`)).text();
            serverData = JSON.parse(temp)?.result.url;
            this.useGoogleTranslate = true;
        } catch (e) {
            console.error(e);
            this.useGoogleTranslate = true;
        }

        const vidplayURL = (await this.decodeURL(serverData)).url;

        const payload = vidplayURL.split("/").pop()!;

        return await new Extractor(payload, result).extract(server ?? StreamingServers.VizCloud);
    }

    override async fetchServers(id: string, subType: SubType): Promise<Server[] | undefined> {
        let data: any = {};

        try {
            const newId = subType === SubType.DUB ? id.split(",")[id.split(",").length - 1] : id.split(",")[1] ?? id.split(",")[0];

            const vrf = await this.getVRF(newId);
            const url = `${this.url}/ajax/server/list/${newId}?${vrf.vrfQuery}=${encodeURIComponent(vrf.url)}`;

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

    private async getVRF(query: string): Promise<VRF> {
        if (!this.resolver)
            return {
                url: query,
                vrfQuery: "vrf",
            };

        return (await (await this.request(`${this.resolver}/vrf?query=${encodeURIComponent(query)}&apikey=${this.resolverKey}`, {}, false)).json()) as VRF;
    }

    public async getSearchVRF(query: string): Promise<VRF> {
        if (!this.resolver)
            return {
                url: query,
                vrfQuery: "vrf",
            };

        return (await (await this.request(`${this.resolver}/9anime-search?query=${encodeURIComponent(query)}&apikey=${this.resolverKey}`, {}, false)).json()) as VRF;
    }

    private async decodeURL(query: string): Promise<VRF> {
        if (!this.resolver)
            return {
                url: query,
                vrfQuery: "vrf",
            };

        return (await (await this.request(`${this.resolver}/decrypt?query=${encodeURIComponent(query)}&apikey=${this.resolverKey}`, {}, false)).json()) as VRF;
    }

    /*
    // This bypass works. However because it sends requests very quickly in a short amount of time, it causes proxies to get banned very quickly.
    override async request(url: string, options: RequestInit = {}, proxyRequest = true): Promise<Response> {
        if (url.includes(this.resolver ?? "")) {
            return Http.request(this.id, true, url, options, false);
        }
        const proxy = proxyRequest ? ((this.customProxy?.length ?? 0) > 0 ? this.customProxy : Http.getRandomUnbannedProxy(this.id)) : undefined;

        const headers = {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.5 Mobile/15E148 Safari/604.1",
            Referer: this.url,
        };

        const req1 = await Http.request(this.id, this.useGoogleTranslate, this.url, { headers }, proxyRequest, 0, proxy);

        const data1 = await req1.text();

        if (!isString(data1)) {
            return Http.request(this.id, this.useGoogleTranslate, url, options, proxyRequest, 0, proxy);
        }

        // Extract _a and _b values
        const _aMatch = data1.match(/var _a\s*=\s*'([0-9a-f]+)'/);
        const _bMatch = data1.match(/_b\s*=\s*'([0-9a-f]+)'/);
        const _a = _aMatch?.[1];
        const _b = _bMatch?.[1];
        if (!_a || !_b) {
            return Http.request(this.id, this.useGoogleTranslate, url, options, proxyRequest, 0, proxy);
        }

        // Now fetch k value
        const req2 = await Http.request(this.id, this.useGoogleTranslate, `${this.url}/waf-js-run`, { headers }, proxyRequest, 0, proxy);
        const data2 = await req2.text();

        const context = { global: global, data: "" };
        vm.createContext(context);

        vm.runInContext(
            `
        const location = {
            href: "${this.url}/waf-js-run",
        };
    
        function EvalDecode(source) {
            global._eval = global.eval;
            
            global.eval = (_code) => {
                global.eval = global._eval;
                return _code;
            };
            
            return global._eval(source);
        }
    
        const code = EvalDecode("${data2}");
        data = code;
        `,
            context,
        );

        const kMatch = context.data.match(/var k='([^']+)'/);
        if (!kMatch) {
            console.error("Failed to extract k value");
            return Http.request(this.id, this.useGoogleTranslate, url, options, proxyRequest, 0, proxy);
        }
        const k = kMatch[1];

        // Construct o value
        const l = k.length;
        if (l !== _a.length || l !== _b.length) {
            console.error("Length of k, _a and _b do not match");
            return Http.request(this.id, this.useGoogleTranslate, url, options, proxyRequest, 0, proxy);
        }
        const o = Array.from(k)
            .map((char, i) => char + _a[i] + _b[i])
            .join("");

        // Update URL with __jscheck parameter
        const updatedUrl = this.url.replace(/&?__jscheck=[^&]+/g, "") + (this.url.indexOf("?") < 0 ? "?" : "&") + "__jscheck=" + o;

        const req3 = await Http.request(this.id, this.useGoogleTranslate, updatedUrl, { headers, redirect: "follow" }, proxyRequest, 0, proxy);
        console.log(req3.headers);

        const cookies = req3.headers.get("set-cookie");

        console.log(await req3.text());

        return Http.request(this.id, this.useGoogleTranslate, url, { headers: { Cookie: cookies ?? "" }, ...options }, proxyRequest, 0, proxy);

        //return Http.request(url, { headers: { Cookie: cookies?.join("; ") ?? "" }, ...options }, proxyRequest, 0, proxy);
    }
    */

    /*
    The waf page evals this:
    (function (h) {
        var k = 'c419b06b4c6579b50ff05adb3b8424f1',
            l = k.length,
            u = 'undefined',
            i, o = '';
        if (typeof _a == u || typeof _b == u) return;
        if (l != _a.length || l != _b.length) return;
        for (i = 0; i < l; i++) o += k[i] + _a[i] + _b[i];
        location.href = h.replace(/&?__jscheck=[^&]+/g, '') + (h.indexOf('?') < 0 ? '?' : '&') + '__jscheck=' + o;
    })(location.href);
    */
}

type VRF = {
    url: string;
    vrfQuery: string;
};
