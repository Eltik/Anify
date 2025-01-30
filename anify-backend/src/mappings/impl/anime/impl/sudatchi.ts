import { load } from "cheerio";
import AnimeProvider from "..";
import { type IEpisode, type IProviderResult, MediaFormat } from "../../../../types";
import { type ISource, SubType } from "../../../../types/impl/mappings/impl/anime";

export default class Sudatchi extends AnimeProvider {
    override rateLimit = 0;
    override maxConcurrentRequests: number = -1;
    override id = "sudatchi";
    override url = "https://sudatchi.com";

    public needsProxy: boolean = true;
    public useGoogleTranslate: boolean = false;

    override formats: MediaFormat[] = [MediaFormat.MOVIE, MediaFormat.ONA, MediaFormat.OVA, MediaFormat.SPECIAL, MediaFormat.TV, MediaFormat.TV_SHORT];

    override get subTypes(): SubType[] {
        return [SubType.SUB];
    }

    override get headers(): Record<string, string> | undefined {
        return undefined;
    }

    override async search(query: string): Promise<IProviderResult[] | undefined> {
        const results: IProviderResult[] = [];

        const data = (await (
            await this.request(`${this.url}/api/directory?&title=${encodeURIComponent(query)}`, {
                validateResponse: async (response) => {
                    if (!response.ok) return false;
                    try {
                        const data = (await response.json()) as { animes?: unknown };
                        return data?.animes !== undefined;
                    } catch {
                        return false;
                    }
                },
            })
        ).json()) as {
            animes: {
                id: number;
                anilistId: number;
                titleRomanji: string | null;
                titleEnglish: string | null;
                titleJapanese: string | null;
                titleSpanish: string | null;
                titleFilipino: string | null;
                titleHindi: string | null;
                titleKorean: string | null;
                synonym: string | null; // Separated by commas
                synopsis: string | null;
                slug: string;
                statusId: number;
                typeId: number;
                year: number | null;
                season: number | null;
                totalEpisodes: number | null;
                seasonNumber: number | null;
                imgUrl: string | null; // Encrypted/obfuscated
                imgBanner: string | null; // Encrypted/obfuscated
                trailerLink: string | null;
                animeCrunchyId: string | null;
                crunchyrollId: string | null;
                hidiveId: string | null;
                seasonHidiveId: string | null;
                initialAirDate: string | null;
                isAdult: boolean;
                prequelId: number | null;
                sequelId: number | null;
                Type: {
                    id: number;
                    name: string;
                };
                Status: {
                    id: number;
                    name: string;
                };
            }[];
            page: number;
            pages: number;
        };

        for (const item of data.animes) {
            const altTitles: string[] = [];
            if (item.titleEnglish) altTitles.push(item.titleEnglish);
            if (item.titleJapanese) altTitles.push(item.titleJapanese);
            if (item.titleSpanish) altTitles.push(item.titleSpanish);
            if (item.titleFilipino) altTitles.push(item.titleFilipino);
            if (item.titleHindi) altTitles.push(item.titleHindi);
            if (item.titleKorean) altTitles.push(item.titleKorean);
            if (item.synonym) altTitles.push(...item.synonym.split(",").map((s) => s.trim()));

            results.push({
                id: item.slug,
                altTitles,
                format: (item.Type.name as MediaFormat) || MediaFormat.UNKNOWN,
                img: item.imgUrl ? `https://ipfs.animeui.com/ipfs/${item.imgUrl}` : null,
                providerId: this.id,
                title: item.titleRomanji ?? item.titleEnglish ?? item.titleJapanese ?? item.titleSpanish ?? item.titleFilipino ?? item.titleHindi ?? item.titleKorean ?? "Unknown",
                year: item.year ?? 0,
            });
        }

        return results;
    }

    override async fetchEpisodes(id: string): Promise<IEpisode[] | undefined> {
        const episodes: IEpisode[] = [];

        const data = await (
            await this.request(`${this.url}/anime/${id}`, {
                validateResponse: async (response) => {
                    if (!response.ok) return false;
                    return (await response.text()).length > 0;
                },
            })
        ).text();
        const $ = load(data);
        const props = JSON.parse(
            $("script#__NEXT_DATA__")
                .html()!
                .replace(/(\r\n|\n|\r|\t)/gm, ""),
        );

        const animeData = props.props.pageProps.animeData;
        const episodeData: [
            {
                id: number;
                title: string;
                number: number;
                imgUrl: string;
                animeId: number;
                isProcessed: boolean;
                openingStartsAt: number | null;
                openingEndsAt: number | null;
                _count: {
                    Subtitles: number;
                    AudioStreams: number;
                };
                releaseDate: string | null;
                subtitleCount: number;
                audioCount: number;
            },
        ] = animeData.Episodes;

        for (const episode of episodeData) {
            episodes.push({
                id: `${btoa(id)}-${episode.id}-${episode.number}`,
                description: null,
                hasDub: episode.audioCount > 0,
                img: episode.imgUrl.startsWith("/images") ? `${this.url}${episode.imgUrl}` : `https://ipfs.animeui.com/ipfs/${episode.imgUrl}`,
                isFiller: false,
                number: episode.number,
                rating: null,
                title: episode.title,
                updatedAt: episode.releaseDate ? new Date(episode.releaseDate ?? 0).getTime() : undefined,
            });
        }

        return episodes;
    }

    /**
     * @description Fetches sources for a given episode ID.
     * Sudatchi doesn't support dub. Also fetching sources is easy,
     * and they don't have multiple sources so StreamingServers is not needed.
     *
     * @param id Episode ID
     * @returns Promise<ISource | undefined>
     */
    override async fetchSources(id: string): Promise<ISource | undefined> {
        const animeId = atob(id.split("-")[0]);
        const episodeId = id.split("-")[1];
        const episodeNumber = id.split("-")[2];

        const req = await (
            await this.request(`${this.url}/watch/${animeId}/${episodeNumber}`, {
                validateResponse: async (response) => {
                    if (!response.ok) return false;
                    return (await response.text()).length > 0;
                },
            })
        ).text();
        const $ = load(req);
        const props = JSON.parse(
            $("script#__NEXT_DATA__")
                .html()!
                .replace(/(\r\n|\n|\r|\t)/gm, ""),
        );
        const streamData = (await (
            await this.request(`${this.url}/api/streams?episodeId=${episodeId}`, {
                validateResponse: async (response) => {
                    if (!response.ok) return false;
                    try {
                        const data = (await response.json()) as { url?: unknown };
                        return data?.url !== undefined;
                    } catch {
                        return false;
                    }
                },
            })
        ).json()) as { url: string };

        const parsedSubtitles: {
            id: number;
            episodeId: number;
            subtitleId: number;
            url: string;
            SubtitlesName: {
                id: number;
                name: string;
                language: string;
            };
        }[] = JSON.parse(props.props.pageProps.episodeData.subtitlesJson);

        const subtitles = props.props.pageProps.episodeData.subtitles
            .map((a: { id: number; name: string; language: string }) => {
                const parsedSubtitle = parsedSubtitles.find((s) => s.subtitleId === a.id);
                if (!parsedSubtitle) return null;

                return {
                    url: `https://ipfs.animeui.com${parsedSubtitle.url}`,
                    lang: a.language,
                    label: a.name,
                };
            })
            .filter(Boolean);

        return {
            intro: {
                start: props.props.pageProps.episodeData.episode.openingStartsAt ?? 0,
                end: props.props.pageProps.episodeData.episode.openingEndsAt ?? 0,
            },
            outro: {
                start: 0,
                end: 0,
            },
            sources: [
                {
                    quality: "auto",
                    url: `${this.url}/${streamData.url}`,
                },
            ],
            subtitles,
            headers: props.props.pageProps.headers,
            audio: props.props.pageProps.episodeData.episode.AudioStreams.map((a: { id: number; episodeId: number; languageId: number; isDefault: boolean; autoSelect: boolean; playlistUri: string }) => {
                return {
                    url: `https://ipfs.animeui.com/ipfs/${a.playlistUri}`,
                    name: a.isDefault ? "Default" : `Audio ${a.languageId}`,
                    language: a.languageId,
                };
            }),
        };
    }

    override async proxyCheck(proxyURL: string): Promise<boolean | undefined> {
        try {
            const results: IProviderResult[] = [];

            const data = (await (
                await this.request(`${this.url}/api/directory?&title=${encodeURIComponent("Mushoku Tensei")}`, {
                    proxy: proxyURL,
                    validateResponse: async (response) => {
                        if (!response.ok) return false;
                        try {
                            const data = (await response.json()) as { animes?: unknown };
                            return data?.animes !== undefined;
                        } catch {
                            return false;
                        }
                    },
                })
            ).json()) as {
                animes: {
                    id: number;
                    anilistId: number;
                    titleRomanji: string | null;
                    titleEnglish: string | null;
                    titleJapanese: string | null;
                    titleSpanish: string | null;
                    titleFilipino: string | null;
                    titleHindi: string | null;
                    titleKorean: string | null;
                    synonym: string | null; // Separated by commas
                    synopsis: string | null;
                    slug: string;
                    statusId: number;
                    typeId: number;
                    year: number | null;
                    season: number | null;
                    totalEpisodes: number | null;
                    seasonNumber: number | null;
                    imgUrl: string | null; // Encrypted/obfuscated
                    imgBanner: string | null; // Encrypted/obfuscated
                    trailerLink: string | null;
                    animeCrunchyId: string | null;
                    crunchyrollId: string | null;
                    hidiveId: string | null;
                    seasonHidiveId: string | null;
                    initialAirDate: string | null;
                    isAdult: boolean;
                    prequelId: number | null;
                    sequelId: number | null;
                    Type: {
                        id: number;
                        name: string;
                    };
                    Status: {
                        id: number;
                        name: string;
                    };
                }[];
                page: number;
                pages: number;
            };

            for (const item of data.animes) {
                const altTitles: string[] = [];
                if (item.titleEnglish) altTitles.push(item.titleEnglish);
                if (item.titleJapanese) altTitles.push(item.titleJapanese);
                if (item.titleSpanish) altTitles.push(item.titleSpanish);
                if (item.titleFilipino) altTitles.push(item.titleFilipino);
                if (item.titleHindi) altTitles.push(item.titleHindi);
                if (item.titleKorean) altTitles.push(item.titleKorean);
                if (item.synonym) altTitles.push(...item.synonym.split(",").map((s) => s.trim()));

                results.push({
                    id: item.slug,
                    altTitles,
                    format: (item.Type.name as MediaFormat) || MediaFormat.UNKNOWN,
                    img: item.imgUrl ? `https://ipfs.animeui.com/ipfs/${item.imgUrl}` : null,
                    providerId: this.id,
                    title: item.titleRomanji ?? item.titleEnglish ?? item.titleJapanese ?? item.titleSpanish ?? item.titleFilipino ?? item.titleHindi ?? item.titleKorean ?? "Unknown",
                    year: item.year ?? 0,
                });
            }

            return results.length > 0;
        } catch {
            return false;
        }
    }
}
