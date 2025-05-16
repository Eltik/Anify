import AnimeProvider from "..";
import { type ISource, StreamingServers, SubType } from "../../../../types/impl/mappings/impl/anime";
import { type IEpisode, type IProviderResult, MediaFormat } from "../../../../types";
import { type CheerioAPI, load } from "cheerio";
import { extractSource } from "../../../../video-extractors";

export default class HiAnime extends AnimeProvider {
    override rateLimit = 0;
    override maxConcurrentRequests: number = -1;
    override id = "hianime";
    override url = "https://hianimez.to";

    public needsProxy: boolean = true;
    public useGoogleTranslate: boolean = false;

    override formats: MediaFormat[] = [MediaFormat.MOVIE, MediaFormat.ONA, MediaFormat.OVA, MediaFormat.SPECIAL, MediaFormat.TV, MediaFormat.TV_SHORT];

    public preferredTitle: "english" | "romaji" | "native" = "romaji";

    override get subTypes(): SubType[] {
        return [SubType.SUB, SubType.DUB];
    }

    override get headers(): Record<string, string> | undefined {
        return undefined;
    }

    override async search(query: string, format?: MediaFormat, year?: number): Promise<IProviderResult[] | undefined> {
        const data = await (
            await this.request(
                `${this.url}/search?keyword=${encodeURIComponent(query)}${format ? (format === MediaFormat.MOVIE ? "&type=1" : format === MediaFormat.TV ? "&type=2" : format === MediaFormat.OVA ? "&type=3" : format === MediaFormat.ONA ? "&type=4" : format === MediaFormat.SPECIAL ? "&type=5" : format === MediaFormat.MUSIC ? "&type=6" : "") : ""}${year ? `&sy=${year}` : ""}`,
            )
        ).text();
        const results: IProviderResult[] = [];

        const $ = load(data);

        const promises: Promise<void>[] = [];

        $(".film_list-wrap > div.flw-item").map((i, el) => {
            const promise = new Promise<void>(async (resolve) => {
                const title = $(el).find("div.film-detail h3.film-name a.dynamic-name").attr("title")!.trim().replace(/\\n/g, "");
                const id = $(el).find("div:nth-child(1) > a").last().attr("href")!;
                const img = $(el).find("img").attr("data-src")!;

                const altTitles: string[] = [];
                const jpName = $(el).find("div.film-detail h3.film-name a.dynamic-name").attr("data-jname")!.trim().replace(/\\n/g, "");
                altTitles.push(jpName);

                const formatString: string = $(el).find("div.film-detail div.fd-infor span.fdi-item")?.first()?.text().toUpperCase();
                const format: MediaFormat = Object.values(MediaFormat).includes(formatString as MediaFormat) ? (formatString as MediaFormat) : MediaFormat.UNKNOWN;

                const req = await (await this.request(`${this.url}${id}`)).text();

                const $$ = load(req);
                const jpTitle = $$($$("div.anisc-info-wrap div.anisc-info div.item").toArray()[1]).find("span.name").text();
                const synonyms = $$($$("div.anisc-info-wrap div.anisc-info div.item").toArray()[2])
                    .find("span.name")
                    .text()
                    ?.split(",")
                    .map((value) => value.trim())
                    ?.filter((value) => value !== "")
                    ?.filter(Boolean);
                const year = $$($$("div.anisc-info-wrap div.anisc-info div.item").toArray()[4]).find("span.name").text().split(" ")[1];

                if (jpTitle) {
                    altTitles.push(jpTitle);
                }

                if (synonyms) {
                    altTitles.push(...synonyms);
                }

                results.push({
                    id: id,
                    title: title,
                    altTitles: altTitles,
                    year: year ? Number(year) : 0,
                    format,
                    img: img,
                    providerId: this.id,
                });

                resolve();
            });

            promises.push(promise);
        });

        await Promise.all(promises);

        return results;
    }

    override async fetchEpisodes(id: string): Promise<IEpisode[] | undefined> {
        const episodes: IEpisode[] = [];

        const data = (await (
            await this.request(`${this.url}/ajax/v2/episode/list/${id.split("-").pop()}`, {
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    Referer: `${this.url}/watch/${id}`,
                },
            })
        ).json()) as { html: string };

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
                description: null,
                rating: null,
            });
        });

        return episodes;
    }

    override async fetchSources(id: string, subType: SubType = SubType.SUB, server: StreamingServers = StreamingServers.VidCloud): Promise<ISource | undefined> {
        const data = (await (await this.request(`${this.url}/ajax/v2/episode/servers?episodeId=${id.split("?ep=")[1]}`)).json()) as { html: string };
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

                if (!serverId) throw new Error("VidCloud not found");
                break;
            case StreamingServers.VidStreaming:
                serverId = this.retrieveServerId($, 4, subType);

                if (!serverId) throw new Error("VidStreaming not found");
                break;
            case StreamingServers.StreamSB:
                serverId = this.retrieveServerId($, 5, subType);

                if (!serverId) throw new Error("StreamSB not found");
                break;
            default:
                serverId = this.retrieveServerId($, 4, subType);

                if (!serverId) throw new Error("RapidCloud not found");
                break;
        }

        const req = (await (await this.request(`${this.url}/ajax/v2/episode/sources?id=${serverId}`)).json()) as { link: string };
        const link = req.link;

        const sources = await extractSource(link, server ?? StreamingServers.VidCloud);
        if (!sources) return undefined;

        sources.headers = {
            ...sources.headers,
            ...this.headers,
        };

        return sources;
    }

    private retrieveServerId($: CheerioAPI, index: number, subOrDub: SubType) {
        return (
            $(`div.ps_-block.ps_-block-sub.servers-${subOrDub} > div.ps__-list > div`)
                .map((_, el) => ($(el).attr("data-server-id") === `${index}` ? $(el) : null))
                .get()[0]
                ?.attr("data-id") ?? ""
        );
    }

    override async proxyCheck(proxyURL: string): Promise<boolean | undefined> {
        try {
            const data = await (
                await this.request(`${this.url}/search?keyword=${encodeURIComponent("Mushoku Tensei")}`, {
                    proxy: proxyURL,
                })
            ).text();
            const results: IProviderResult[] = [];

            const $ = load(data);

            const promises: Promise<void>[] = [];

            $(".film_list-wrap > div.flw-item").map((i, el) => {
                const promise = new Promise<void>(async (resolve) => {
                    const title = $(el).find("div.film-detail h3.film-name a.dynamic-name").attr("title")!.trim().replace(/\\n/g, "");
                    const id = $(el).find("div:nth-child(1) > a").last().attr("href")!;
                    const img = $(el).find("img").attr("data-src")!;

                    const altTitles: string[] = [];
                    const jpName = $(el).find("div.film-detail h3.film-name a.dynamic-name").attr("data-jname")!.trim().replace(/\\n/g, "");
                    altTitles.push(jpName);

                    const formatString: string = $(el).find("div.film-detail div.fd-infor span.fdi-item")?.first()?.text().toUpperCase();
                    const format: MediaFormat = Object.values(MediaFormat).includes(formatString as MediaFormat) ? (formatString as MediaFormat) : MediaFormat.UNKNOWN;

                    const req = await (
                        await this.request(`${this.url}${id}`, {
                            proxy: proxyURL,
                        })
                    ).text();

                    const $$ = load(req);
                    const jpTitle = $$($$("div.anisc-info-wrap div.anisc-info div.item").toArray()[1]).find("span.name").text();
                    const synonyms = $$($$("div.anisc-info-wrap div.anisc-info div.item").toArray()[2])
                        .find("span.name")
                        .text()
                        ?.split(",")
                        .map((value) => value.trim())
                        ?.filter((value) => value !== "")
                        ?.filter(Boolean);
                    const year = $$($$("div.anisc-info-wrap div.anisc-info div.item").toArray()[4]).find("span.name").text().split(" ")[1];

                    if (jpTitle) {
                        altTitles.push(jpTitle);
                    }

                    if (synonyms) {
                        altTitles.push(...synonyms);
                    }

                    results.push({
                        id: id,
                        title: title,
                        altTitles: altTitles,
                        year: year ? Number(year) : 0,
                        format,
                        img: img,
                        providerId: this.id,
                    });

                    resolve();
                });

                promises.push(promise);
            });

            await Promise.all(promises);

            return results.length > 0;
        } catch {
            return false;
        }
    }
}
