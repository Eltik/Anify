import AnimeProvider from ".";
import { Episode, Result, Server, Source } from "../../../types/types";
import { load } from "cheerio";

import { env } from "../../../env";
import { Format, Formats, StreamingServers, SubType } from "../../../types/enums";
import Extractor from "../../../helper/extractor";

export default class NineAnime extends AnimeProvider {
    override rateLimit = 250;
    override id = "9anime";
    override url = "https://aniwave.to";
    override formats: Format[] = [Format.MOVIE, Format.ONA, Format.OVA, Format.SPECIAL, Format.TV, Format.TV_SHORT];

    private resolver: string | undefined = env.NINEANIME_RESOLVER;
    private resolverKey: string | undefined = env.NINEANIME_KEY || `9anime`;

    override get subTypes(): SubType[] {
        return [SubType.SUB, SubType.DUB];
    }

    override get headers(): Record<string, string> | undefined {
        return { Referer: "https://vidstream.pro/", "X-Requested-With": "XMLHttpRequest" };
    }

    override async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        const vrf = await this.getSearchVRF(query);
        const data = await (await this.request(`${this.url}/ajax/anime/search?keyword=${encodeURIComponent(query)}&${vrf.vrfQuery}=${encodeURIComponent(vrf.url)}`, {}, true)).json();

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
        const data = await (await this.request(`${this.url}${id}`, {})).text();

        const $ = load(data);

        const nineId = $("#watch-main").attr("data-id")!;

        const vrf = await this.getVRF(nineId);

        const req = await this.request(`${this.url}/ajax/episode/list/${nineId}?${vrf.vrfQuery}=${encodeURIComponent(vrf.url)}`, {}, true);

        const $$ = load((await req.json()).result);

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
                updatedAt,
            };

            episodes.push(episode);
        }

        return episodes;
    }

    override async fetchSources(id: string, subType: SubType = SubType.SUB, server: StreamingServers = StreamingServers.MyCloud): Promise<Source | undefined> {
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
            const serverUrl = new URL(id);

            const req = await this.request(serverUrl.href, {});
            if (!req.ok) {
                return result;
            }
            const json = await req.json();
            if (!json.result) {
                return result;
            }

            const serverID = serverUrl.href.split(`${this.url}/ajax/server/`)[1].split("?vrf")[0];
            const serverVrf = await this.getRawVRF(serverID);

            const serverSource = await (await this.request(`${this.url}/ajax/server/${serverID}?${serverVrf.vrfQuery}=${encodeURIComponent(serverVrf.url)}`, {}, true)).json();

            try {
                const skipData = JSON.parse((await this.decodeURL(json.result?.skip_data!)).url);
                result.intro.start = skipData?.intro?.[0] ?? 0;
                result.intro.end = skipData?.intro?.[1] ?? 0;

                result.outro.start = skipData?.outro?.[0] ?? 0;
                result.outro.end = skipData?.outro?.[1] ?? 0;
            } catch (e) {
                console.error("9Anime skip data error");
                console.error(e);
            }

            const source = (await (await this.request(`${this.resolver}/decrypt?query=${encodeURIComponent(serverSource.result?.url)}&apikey=${this.resolverKey}`)).json()).url.split("/").pop();

            return await new Extractor(source, result).extract(server ?? StreamingServers.MyCloud);
        }

        if (subType === SubType.SUB) {
            id = id.split(",")[0];
        } else {
            id = id.split(",")[1];
            if (!id) return result;
        }

        const servers = (await this.fetchServers(id))!;

        let s = servers.find((s) => s.name === server);

        switch (server) {
            case StreamingServers.VizCloud:
                s = servers.find((s) => s.name === "vidstream")!;
                if (!s) throw new Error("Vidstream server found");
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

        return await this.fetchSources(s.url, subType, server ?? StreamingServers.MyCloud);
    }

    override async fetchServers(id: string): Promise<Server[] | undefined> {
        const vrf = await this.getVRF(id);
        const url = `${this.url}/ajax/server/list/${id}?${vrf.vrfQuery}=${encodeURIComponent(vrf.url)}`;

        const data = await (await this.request(url, {}, true)).json();

        const $ = load(data.result);

        const servers: Server[] = [];
        const promises: Promise<boolean>[] = [];

        $(".type > ul > li").each((i, el) => {
            const promise: Promise<boolean> = new Promise(async (resolve, reject) => {
                const serverId = $(el).attr("data-link-id")!;
                const vrf = await this.getRawVRF(serverId);
                servers.push({
                    name: $(el).text().toLocaleLowerCase(),
                    url: `${this.url}/ajax/server/${serverId}?${vrf.vrfQuery}=${encodeURIComponent(vrf.url)}`,
                });
                resolve(true);
            });
            promises.push(promise);
        });

        await Promise.all(promises);
        return servers;
    }

    private async getVRF(query: string): Promise<VRF> {
        if (!this.resolver)
            return {
                url: query,
                vrfQuery: "vrf",
            };

        return await (await this.request(`${this.resolver}/vrf?query=${encodeURIComponent(query)}&apikey=${this.resolverKey}`, {})).json();
    }

    public async getSearchVRF(query: string): Promise<VRF> {
        if (!this.resolver)
            return {
                url: query,
                vrfQuery: "vrf",
            };

        return await (await this.request(`${this.resolver}/9anime-search?query=${encodeURIComponent(query)}&apikey=${this.resolverKey}`, {})).json();
    }

    private async getRawVRF(query: string): Promise<VRF> {
        if (!this.resolver)
            return {
                url: query,
                vrfQuery: "vrf",
            };

        return await (await this.request(`${this.resolver}/rawVrf?query=${encodeURIComponent(query)}&apikey=${this.resolverKey}`, {})).json();
    }

    private async decodeURL(query: string): Promise<VRF> {
        if (!this.resolver)
            return {
                url: query,
                vrfQuery: "vrf",
            };

        return await (await this.request(`${this.resolver}/decrypt?query=${encodeURIComponent(query)}&apikey=${this.resolverKey}`, {})).json();
    }

    // This bypass works. However because it sends requests very quickly in a short amount of time, it causes proxies to get banned very quickly.
    /*
    override async request(url: string, options: RequestInit = {}, proxyRequest = true): Promise<Response> {
        const proxy = proxyRequest ? ((this.customProxy?.length ?? 0) > 0 ? this.customProxy : Http.getRandomUnbannedProxy()) : undefined;

        const headers = {
            "User-Agent": this.userAgent,
            Referer: this.url,
        };

        const req1 = await Http.request(this.url, { headers }, proxyRequest, 0, proxy);

        const data1 = await req1.text();

        if (!isString(data1)) {
            return Http.request(url, options, proxyRequest, 0, proxy);
        }

        // Extract _a and _b values
        const _aMatch = data1.match(/var _a\s*=\s*'([0-9a-f]+)'/);
        const _bMatch = data1.match(/_b\s*=\s*'([0-9a-f]+)'/);
        const _a = _aMatch?.[1];
        const _b = _bMatch?.[1];
        if (!_a || !_b) {
            return Http.request(url, options, proxyRequest, 0, proxy);
        }

        // Now fetch k value
        const req2 = await Http.request(`${this.url}/waf-js-run`, { headers }, proxyRequest, 0, proxy);
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
            context
        );

        const kMatch = context.data.match(/var k='([^']+)'/);
        if (!kMatch) {
            console.error("Failed to extract k value");
            return Http.request(url, options, proxyRequest, 0, proxy);
        }
        const k = kMatch[1];

        // Construct o value
        const l = k.length;
        if (l !== _a.length || l !== _b.length) {
            console.error("Length of k, _a and _b do not match");
            return Http.request(url, options, proxyRequest, 0, proxy);
        }
        const o = Array.from(k)
            .map((char, i) => char + _a[i] + _b[i])
            .join("");

        // Update URL with __jscheck parameter
        const updatedUrl = this.url.replace(/&?__jscheck=[^&]+/g, "") + (this.url.indexOf("?") < 0 ? "?" : "&") + "__jscheck=" + o;

        const req3 = await Http.request(updatedUrl, { headers }, proxyRequest, 0, proxy);
        const cookies = req3.headers["set-cookie"];

        return Http.request(url, { headers: { Cookie: cookies?.join("; ") ?? "" }, ...options }, proxyRequest, 0, proxy);
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
