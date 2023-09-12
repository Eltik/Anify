import CryptoJS from "crypto-js";
import { load } from "cheerio";
import { substringAfter, substringBefore } from ".";
import { env } from "process";
import { Source } from "../types/types";
import { StreamingServers } from "../types/enums";

export default class Extractor {
    private url: string;
    private result: Source;

    constructor(url: string, result: Source) {
        this.url = url;
        this.result = result;
    }

    async extract(server: StreamingServers): Promise<Source | undefined> {
        switch (server) {
            case StreamingServers.GogoCDN:
                return await this.extractGogoCDN(this.url, this.result);
            case StreamingServers.StreamSB:
                return await this.extractStreamSB(this.url, this.result);
            case StreamingServers.VidCloud:
                return await this.extractVidCloud(this.url, this.result);
            case StreamingServers.VidStreaming:
                return await this.extractGogoCDN(this.url, this.result);
            case StreamingServers.StreamTape:
                return await this.extractStreamTape(this.url, this.result);
            case StreamingServers.MyCloud:
                return await this.extractMyCloud(this.url, this.result);
            case StreamingServers.Filemoon:
                return await this.extractFileMoon(this.url, this.result);
            case StreamingServers.VizCloud:
                return await this.extractVizCloud(this.url, this.result);
            case StreamingServers.Kwik:
                return await this.extractKwik(this.url, this.result);
            case StreamingServers.AllAnime:
                return await this.extractAllAnime(this.url, this.result);
            case StreamingServers.AnimeFlix:
                return await this.extractAnimeFlix(this.url, this.result);
            default:
                return undefined;
        }
    }

    public async extractAnimeFlix(url: string, result: Source): Promise<Source> {
        const data = await (
            await fetch(url, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.5790.171 Safari/537.36",
                },
            })
        ).text();

        const $ = load(data);
        // const source = 'https://cdn.discordapp.com/attachments/1126579073980846132/1141026618941382696/1080p-ROCK.m3u8';
        /*
        var options = {
            video: plyrplayer,
            subUrl: JSON.parse('[{"url":"https://proxy.gogocden.site/https://cdn.discordapp.com/attachments/1126579089524932669/1141026620472315946/ENG.ass","title":"ENG","lang":"ENG"}]').find(sub => sub.title === name)?.url,
            fonts: ['/public/trebuc.woff2', '/public/AdobeArabic-Bold.woff2'],
            workerUrl: '/public/subtitle-worker.js',
            legacyWorkerUrl: '/public/subtitle-worker-legacy.js'
        };
        */

        const source = $.html().split("const source = '")[1].split("';")[0];
        if (source.includes("https://cdn.discordapp.com")) {
            result.sources.push({
                quality: "1080p",
                url: source,
            });
        } else {
            result.sources.push({
                quality: "auto",
                url: source,
            });

            const req = await fetch(source, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.5790.171 Safari/537.36",
                    Referer: "https://api.animeflix.live",
                },
            });

            const resolutions = (await req.text()).match(/(RESOLUTION=)(.*)(\s*?)(\s*.*)/g);
            resolutions?.forEach((res: string) => {
                const index = source.lastIndexOf("/");
                const quality = res.split("\n")[0].split("x")[1].split(",")[0];
                const url = source.slice(0, index);
                result.sources.push({
                    url: url + "/" + res.split("\n")[1],
                    quality: quality + "p",
                });
            });
        }

        try {
            const subtitles = JSON.parse($.html().split("instance.setTrackByUrl(JSON.parse(`")[1].split("`).find")[0]);
            subtitles.map((subtitle: { title: string; lang: string; url: string }) => {
                result.subtitles.push({
                    label: subtitle.title,
                    lang: subtitle.lang,
                    url: subtitle.url,
                });
            });
        } catch (e) {
            //
        }

        return result;
    }

    public async extractMyCloud(url: string, result: Source): Promise<Source> {
        const proxy = env.NINEANIME_RESOLVER || "https://9anime.resolver.net";
        const proxyKey: string = env.NINEANIME_KEY || `9anime`;

        const lolToken = await (await fetch("https://mcloud.to/futoken")).text();

        const m3u8Req = await fetch(`${proxy}/rawMcloud?apikey=${proxyKey}`, {
            method: "POST",
            body: JSON.stringify({
                query: url,
                futoken: lolToken,
            }),
            headers: {
                "Content-Type": "application/json",
            },
        });
        const data = await m3u8Req.json();

        const m3u8File = data.rawURL;

        const mainReq = await (
            await fetch(m3u8File, {
                headers: { Referer: "https://vidstream.pro/", "X-Requested-With": "XMLHttpRequest" },
            })
        ).json();

        for (const track of mainReq.result?.tracks ?? []) {
            result.subtitles.push({
                url: track.file,
                lang: track.label ? track.label : track.kind,
                label: track.kind,
            });
        }

        const file = mainReq.result?.sources[0]?.file;

        const req = await fetch(file, {
            headers: { Referer: "https://vidstream.pro/", "X-Requested-With": "XMLHttpRequest" },
        });

        const resolutions = (await req.text()).match(/(RESOLUTION=)(.*)(\s*?)(\s*.*)/g);
        resolutions?.forEach((res: string) => {
            const index = file.lastIndexOf("/");
            const quality = res.split("\n")[0].split("x")[1].split(",")[0];
            const url = file.slice(0, index);
            result.sources.push({
                url: url + "/" + res.split("\n")[1],
                quality: quality + "p",
            });
        });

        // Master m3u8 file
        result.sources.push({
            quality: "auto",
            url: file,
        });

        //result.headers = {}; // TEMP doesnt require proxy

        return result;
    }

    public async extractFileMoon(url: string, result: Source): Promise<Source> {
        const proxy = env.NINEANIME_RESOLVER || "https://9anime.resolver.com";
        const proxyKey: string = env.NINEANIME_KEY || `9anime`;
        const data = await (await fetch(`https://filemoon.sx/d/${url}`)).text();

        const resolver = await fetch(`${proxy}/filemoon?apikey=${proxyKey}`, {
            method: "POST",
            body: JSON.stringify({
                query: data,
            }),
        });

        const resolverData = await resolver.json();

        result.sources.push({
            url: resolverData.url,
            quality: "auto",
        });

        const resReq = await fetch(resolverData.url, { headers: { Referer: "https://9anime.pl" } });
        const resolutions = (await resReq.text()).match(/(RESOLUTION=)(.*)(\s*?)(\s*.*)/g);

        resolutions?.forEach((res: string) => {
            const index = resolverData.url.lastIndexOf("/");
            const quality = res.split("\n")[0].split("x")[1].split(",")[0];
            const url = resolverData.url.slice(0, index);

            result.sources.push({
                url: url + "/" + res.split("\n")[1],
                quality: quality + "p",
            });
        });

        return result;
    }

    /**
     * @description Requires a VizStream ID. Uses NineAnime resolver.
     * @param vidStreamId VizStream ID
     * @returns Promise<SubbedSource>
     */
    public async extractVizCloud(url: string, result: Source): Promise<Source> {
        const proxy = env.NINEANIME_RESOLVER || "https://9anime.resolver.net";
        const proxyKey: string = env.NINEANIME_KEY || `9anime`;

        const lolToken = await (await fetch("https://vidstream.pro/futoken")).text();

        const m3u8Req = await fetch(`${proxy}/rawVizcloud?apikey=${proxyKey}`, {
            method: "POST",
            body: JSON.stringify({
                query: url,
                futoken: lolToken,
            }),
            headers: {
                "Content-Type": "application/json",
            },
        });
        const data = await m3u8Req.json();

        const m3u8File = data.rawURL;

        const mainReq = await (
            await fetch(m3u8File, {
                headers: { Referer: "https://vidstream.pro/", "X-Requested-With": "XMLHttpRequest" },
            })
        ).json();

        for (const track of mainReq.result?.tracks ?? []) {
            result.subtitles.push({
                url: track.file,
                lang: track.label ? track.label : track.kind,
                label: track.kind,
            });
        }

        const file = mainReq.result?.sources[0]?.file;

        const req = await fetch(file, {
            headers: { Referer: "https://vidstream.pro/", "X-Requested-With": "XMLHttpRequest" },
        });

        const resolutions = (await req.text()).match(/(RESOLUTION=)(.*)(\s*?)(\s*.*)/g);
        resolutions?.forEach((res: string) => {
            const index = file.lastIndexOf("/");
            const quality = res.split("\n")[0].split("x")[1].split(",")[0];
            const url = file.slice(0, index);
            result.sources.push({
                url: url + "/" + res.split("\n")[1],
                quality: quality + "p",
            });
        });

        // Master m3u8 file
        result.sources.push({
            quality: "auto",
            url: file,
        });

        //result.headers = {}; // TEMP doesnt require proxy

        return result;
    }

    public async extractGogoCDN(url: string, result: Source): Promise<Source> {
        const keys = {
            key: CryptoJS.enc.Utf8.parse("37911490979715163134003223491201"),
            secondKey: CryptoJS.enc.Utf8.parse("54674138327930866480207815084989"),
            iv: CryptoJS.enc.Utf8.parse("3134003223491201"),
        };

        const req = await fetch(url);
        const $ = load(await req.text());

        const encyptedParams = await generateEncryptedAjaxParams(new URL(url).searchParams.get("id") ?? "");

        const encryptedData = await fetch(`${new URL(url).protocol}//${new URL(url).hostname}/encrypt-ajax.php?${encyptedParams}`, {
            headers: {
                "X-Requested-With": "XMLHttpRequest",
            },
        });

        const decryptedData = await decryptAjaxData((await encryptedData.json())?.data);
        if (!decryptedData.source) throw new Error("No source found. Try a different server.");

        if (decryptedData.source[0].file.includes(".m3u8")) {
            const resResult = await fetch(decryptedData.source[0].file.toString());
            const resolutions = (await resResult.text()).match(/(RESOLUTION=)(.*)(\s*?)(\s*.*)/g);

            resolutions?.forEach((res: string) => {
                const index = decryptedData.source[0].file.lastIndexOf("/");
                const quality = res.split("\n")[0].split("x")[1].split(",")[0];
                const url = decryptedData.source[0].file.slice(0, index);

                result.sources.push({
                    url: url + "/" + res.split("\n")[1],
                    quality: quality + "p",
                });
            });

            decryptedData.source.forEach((source: any) => {
                result.sources.push({
                    url: source.file,
                    quality: "default",
                });
            });
        } else {
            decryptedData.source.forEach((source: any) => {
                result.sources.push({
                    url: source.file,
                    quality: source.label.split(" ")[0] + "p",
                });
            });

            decryptedData.source_bk.forEach((source: any) => {
                result.sources.push({
                    url: source.file,
                    quality: "backup",
                });
            });
        }

        return result;

        function generateEncryptedAjaxParams(id: string) {
            const encryptedKey = CryptoJS.AES.encrypt(id, keys.key, {
                iv: keys.iv,
            });

            const scriptValue = $("script[data-name='episode']").data().value as string;

            const decryptedToken = CryptoJS.AES.decrypt(scriptValue, keys.key, {
                iv: keys.iv,
            }).toString(CryptoJS.enc.Utf8);

            return `id=${encryptedKey}&alias=${id}&${decryptedToken}`;
        }

        function decryptAjaxData(encryptedData: string) {
            const decryptedData = CryptoJS.enc.Utf8.stringify(
                CryptoJS.AES.decrypt(encryptedData, keys.secondKey, {
                    iv: keys.iv,
                }),
            );

            return JSON.parse(decryptedData);
        }
    }

    public async extractStreamSB(url: string, result: Source): Promise<Source> {
        throw new Error("Method not implemented yet.");
    }

    public async extractVidCloud(url: string, result: Source): Promise<Source> {
        const host = "https://megacloud.tv";
        const id = url.split("/").pop()?.split("?")[0];

        const options = {
            headers: {
                "X-Requested-With": "XMLHttpRequest",
                Referer: url,
            },
        };

        const request = await fetch(`${host}/embed-2/ajax/e-1/getSources?id=${id}`, {
            headers: {
                "X-Requested-With": "XMLHttpRequest",
            },
        });

        const reqData = await request.json();

        const { tracks, intro, outro } = reqData;
        let { sources } = reqData;

        const req = await fetch("https://github.com/enimax-anime/key/blob/e6/key.txt");

        const data = await req.text();
        let decryptKey = substringBefore(substringAfter(data, '"blob-code blob-code-inner js-file-line">'), "</td>");
        if (!decryptKey) {
            decryptKey = await (await fetch("https://raw.githubusercontent.com/enimax-anime/key/e6/key.txt")).json();
        }

        const encryptedURLTemp = sources.split("");

        let key = "";

        for (const index of decryptKey) {
            for (let i = Number(index[0]); i < Number(index[1]); i++) {
                key += encryptedURLTemp[i];
                encryptedURLTemp[i] = null;
            }
        }

        sources = encryptedURLTemp.filter((x: any) => x !== null).join("");

        try {
            sources = JSON.parse(CryptoJS.AES.decrypt(sources, key).toString(CryptoJS.enc.Utf8));
        } catch {
            sources = null;
        }

        if (!sources) {
            return result;
        }

        for (const source of sources) {
            if (source.type === "hls") {
                const data = await (await fetch(source.file)).text();

                const resolutions = data.match(/(RESOLUTION=)(.*)(\s*?)(\s*.*)/g);

                resolutions?.forEach((res: string) => {
                    const index = source.file.lastIndexOf("/");
                    const quality = res.split("\n")[0].split("x")[1].split(",")[0];
                    const url = source.file.slice(0, index);

                    result.sources.push({
                        url: url + "/" + res.split("\n")[1],
                        quality: quality + "p",
                    });
                });
            }

            if (intro.end > 1) {
                result.intro = {
                    start: intro.start,
                    end: intro.end,
                };
            }
            if (outro.end > 1) {
                result.outro = {
                    start: outro.start,
                    end: outro.end,
                };
            }
        }

        result.sources.push({
            url: sources[0].file,
            quality: "auto",
        });

        result.subtitles = tracks?.map((s: any) => ({
            url: s.file,
            lang: s.label ? s.label : "Thumbnails",
        }));

        return result;
    }

    public async extractKwik(url: string, result: Source): Promise<Source> {
        const host = "https://animepahe.com"; // Subject to change maybe.
        const req = await fetch(url, { headers: { Referer: host } });
        const match = load(await req.text())
            .html()
            .match(/p\}.*kwik.*/g);
        if (!match) {
            throw new Error("Video not found.");
        }
        let arr: string[] = match[0].split("return p}(")[1].split(",");

        const l = arr.slice(0, arr.length - 5).join("");
        arr = arr.slice(arr.length - 5, -1);
        arr.unshift(l);

        const [p, a, c, k, e, d] = arr.map((x) => x.split(".sp")[0]);

        const formatted = format(p, a, c, k, e, {});

        const source = formatted
            .match(/source=\\(.*?)\\'/g)[0]
            .replace(/\'/g, "")
            .replace(/source=/g, "")
            .replace(/\\/g, "");

        result.sources.push({
            url: source,
            quality: "auto",
        });

        return result;

        function format(p: any, a: any, c: any, k: any, e: any, d: any) {
            k = k.split("|");
            e = (c: any) => {
                return (c < a ? "" : e(parseInt((c / a).toString()))) + ((c = c % a) > 35 ? String.fromCharCode(c + 29) : c.toString(36));
            };
            if (!"".replace(/^/, String)) {
                while (c--) {
                    d[e(c)] = k[c] || e(c);
                }
                k = [
                    (e: any) => {
                        return d[e];
                    },
                ];
                e = () => {
                    return "\\w+";
                };
                c = 1;
            }
            while (c--) {
                if (k[c]) {
                    p = p.replace(new RegExp("\\b" + e(c) + "\\b", "g"), k[c]);
                }
            }
            return p;
        }
    }

    public async extractStreamTape(url: string, result: Source): Promise<Source> {
        throw new Error("Method not implemented yet.");
    }

    public async extractFPlayer(url: string, result: Source): Promise<Source> {
        throw new Error("Method not implemented yet.");
    }

    public async extractAllAnime(url: string, result: Source): Promise<Source> {
        const allAnimeApiUrl = "https://www.allanimenews.com";

        const iframeUrl = `${allAnimeApiUrl}${url}`;

        const data = await (await fetch(iframeUrl)).json();
        const link: string = data.links[0].src;

        if (!link) return result;

        const m3u8 = await (await fetch(link)).text();

        const resolutions = m3u8.match(/(RESOLUTION=)(.*)(\s*?)(\s*.*)/g);

        resolutions?.forEach((res: string) => {
            const quality = res.split("\n")[0].split("x")[1].split(",")[0];

            const uri = new URL(link);
            const url = uri.protocol + "//" + uri.hostname;

            result.sources.push({
                url: url + res.split("\n")[1],
                quality: quality + "p",
            });
        });

        result.sources.push({
            url: link,
            quality: "auto",
        });

        return result;
    }
}
