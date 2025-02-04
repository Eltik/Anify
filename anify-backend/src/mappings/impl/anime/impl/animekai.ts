import { load } from "cheerio";
import AnimeProvider from "..";
import { type ISource, StreamingServers, SubType } from "../../../../types/impl/mappings/impl/anime";
import {type IEpisode, type IProviderResult, MediaFormat } from "../../../../types";
import AnimekaiDecoder from "../../../../video-extractors/impl/animekai-decoder";

const decoder = AnimekaiDecoder

export default class AnimeKai extends AnimeProvider {
    override rateLimit = 0;
    override maxConcurrentRequests = -1;

    override id = "animekai";
    override url = "https://animekai.to";


    public needsProxy = false;
    public useGoogleTranslate = false;

    override formats: MediaFormat[] = [MediaFormat.MOVIE, MediaFormat.ONA, MediaFormat.OVA, MediaFormat.SPECIAL, MediaFormat.TV, MediaFormat.TV_SHORT];

    override get subTypes(): SubType[] {
        return [SubType.SUB, SubType.DUB];
    }

    override get headers(): Record<string, string> | undefined {
        return {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        };
    }

    override async search(query: string): Promise<IProviderResult[] | undefined> {
        const response = await this.request(`${this.url}/browser?keyword=${query}`);
        const $ = load(await response.text());

        const results: IProviderResult[] = [];
        const promises: Promise<void>[] = [];

        $(".aitem-wrapper .aitem").each((i, el) => {
            const promise = (async () => {
                const dataId = $(el).find("button.ttip-btn").attr("data-tip");

                if (!dataId) return;

                const img = $(el).find("img").attr("data-src");
                const res = await this.request(`${this.url}/ajax/anime/tip?id=${dataId}`);
                const $$ = load((await res.json() as { result: string }).result);

                const title = $$('.title').text().trim();
                const altTitles = $$(".al-title").text().trim().split("; ").map(t => t.trim());
                const id = $$("a.watch-btn").attr("href");
                const airedText = $$('div > span:contains("Aired:")').parent().text();
                const yearMatch = airedText.match(/\b(\d{4})\b/);
                const year = yearMatch ? Number.parseInt(yearMatch[1]) : 0;

                if (id) {
                    results.push({
                        id: id,
                        title: title,
                        altTitles: altTitles,
                        year: year,
                        format: MediaFormat.UNKNOWN,
                        img: img || '',
                        providerId: this.id,
                    });
                }
            })();

            promises.push(promise);
        });

        await Promise.all(promises);
        return results;
    }

    override async fetchEpisodes(id: string): Promise<IEpisode[] | undefined> {
        const response = await this.request(`${this.url}${id.includes("/watch/") ? `${id}` : `/watch/${id}`}`);
        const data = await response.text();

        const dataId = data.match(/class="rate-box".*?data-id\s*=\s*["'](.*?)['"]/)?.[1];

        const episodeResponse = await this.request(`${this.url}/ajax/episodes/list?ani_id=${dataId}&_=${decoder.generate_token(dataId as string)}`)

        const episodeData = await episodeResponse.json() as { result: string };

        const $ = load(episodeData.result);

        const episodes = $("a")
        .map((i, el) => {
          return {
            number: Number(el.attribs.num),
            title: $(el).find("span").text(),
            id: el.attribs.token,
            isFiller: false,
            img: "",
            hasDub: false,

            description: "",
            rating: 0,
          };
        })
        .get() as IEpisode[];

        return episodes;
    }

    override async fetchSources(episodeId: string, subType: SubType, server: StreamingServers = StreamingServers.UpCloud): Promise<ISource | undefined> {
        const linksResponse = await this.request(`${this.url}/ajax/links/list?token=${episodeId}&_=${decoder.generate_token(episodeId)}`, {
            headers: {
                "X-Requested-With": "XMLHttpRequest",
            }
        });

        const linksData = await linksResponse.json() as { result: string };
        const $ = load(linksData.result);

        const serverGroups = $(".server-items")
        // @ts-expect-error: This is a valid type
        .map((_index, element) => {
          const serverType = element.attribs["data-id"];
          const serverList = $(element)
            .find("span")
            .map((i, serverElement) => ({
              name: $(serverElement).text(),
              id: serverElement.attribs["data-lid"],
            }))
            .get();
    
          return {
            [serverType]: serverList
          }
        })
        .get() as { sub: { name: string; id: string }[]; dub: { name: string; id: string }[] }[];
    
        const targetType = subType === SubType.SUB ? "sub" : "dub";
        const targetServerName = server === StreamingServers.AnimeKaiMegacloud ? "Server 2" : "Server 1";

        const typeServers = Array.isArray(serverGroups) ? serverGroups.flatMap(group => group[targetType] || []) : [];
        // Normalize the server name to the expected format
        const targetServer = typeServers.find((server: { name: string; id: string }) => (server.name.toLowerCase() === "megacloud" ? "server 2" : "server 1") === targetServerName.toLowerCase());
        const serverId = targetServer?.id;

        const sourceResponse = await this.request(`${this.url}/ajax/links/view?id=${serverId}&_=${decoder.generate_token(serverId as string)}`, {
            headers: {
                "X-Requested-With": "XMLHttpRequest",
            }
        });

        const sourceResponseData = await sourceResponse.json() as { result: string };
        
        const decodedData = JSON.parse(decoder.decode_iframe_data(sourceResponseData.result).replace(/\\/gm, "")) as { url: string };

        const mediaUrl = decodedData.url.replace(/\/(e|e2)\//, "/media/");

        const mediaResponse = await this.request(mediaUrl);
        const mediaData = await mediaResponse.json() as { result: string };

        const decodedMedia = decoder.decode(mediaData.result.replace(/\\/gm, ""));
        const parsedMedia = JSON.parse(decodedMedia);

        return {
            sources: parsedMedia.sources.map((source: { file: string }) => ({
                url: source.file,
                quality: "default"
            })),
            subtitles: parsedMedia.tracks.map((track: { file: string; kind: string }) => ({
                url: track.file,
                lang: track.kind,
                label: track.kind
            })),
            intro: {
                start: 0,
                end: 0
            },
            outro: {
                start: 0,
                end: 0
            },
            headers: {}
        } as ISource;
    }
}