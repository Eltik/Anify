import MangaProvider from "..";
import { type IChapter, type IProviderResult, MediaFormat } from "../../../../types";
import type { IPage } from "../../../../types/impl/mappings/impl/manga";

export default class MangaDex extends MangaProvider {
    override id = "mangadex";
    override url = "https://mangadex.org";

    public needsProxy: boolean = true;
    public useGoogleTranslate: boolean = true;

    override rateLimit = 0;
    override maxConcurrentRequests: number = -1;

    override formats: MediaFormat[] = [MediaFormat.MANGA, MediaFormat.ONE_SHOT];

    private api = "https://api.mangadex.org";

    override async search(query: string): Promise<IProviderResult[] | undefined> {
        const results: IProviderResult[] = [];
        const limit = 25;

        // Build URL with all params at once
        const uri = new URL("/manga", this.api);
        uri.searchParams.set("title", query);
        uri.searchParams.set("limit", String(limit * 2)); // Get 2 pages worth in one request
        uri.searchParams.set("offset", "0");
        uri.searchParams.set("order[relevance]", "desc");
        uri.searchParams.append("contentRating[]", "safe");
        uri.searchParams.append("contentRating[]", "suggestive");
        uri.searchParams.append("includes[]", "cover_art");

        const { data: mangaList = [] } = (await (await this.request(uri.href)).json()) as { data: IManga[] };

        for (const manga of mangaList) {
            const { attributes, relationships, id, type: mangaType } = manga;
            const { title, altTitles, year } = attributes;

            // Find cover art relationship once
            const coverArtId = relationships.find((element) => element.type === "cover_art")?.id;
            const img = coverArtId ? `${this.url}/covers/${id}/${coverArtId}.jpg.512.jpg` : null;

            // Process titles once
            const titleEnglish = altTitles.find((t) => Object.keys(t)[0] === "en")?.en ?? title[Object.keys(title).find((v) => v === "en") ?? ""] ?? null;
            const titleRomaji = title["ja-ro"] ?? title["jp-ro"] ?? altTitles.find((t) => Object.keys(t)[0] === "ja-ro")?.["ja-ro"] ?? altTitles.find((t) => Object.keys(t)[0] === "jp-ro")?.["jp-ro"] ?? null;
            const titleNative = title["jp"] ?? title["ja"] ?? title["ko"] ?? altTitles.find((t) => Object.keys(t)[0] === "jp")?.jp ?? altTitles.find((t) => Object.keys(t)[0] === "ja")?.ja ?? altTitles.find((t) => Object.keys(t)[0] === "ko")?.ko ?? null;

            // Process format once
            const formatString = mangaType.toUpperCase();
            const format = formatString === "ADAPTATION" ? MediaFormat.MANGA : Object.values(MediaFormat).includes(formatString as MediaFormat) ? (formatString as MediaFormat) : MediaFormat.MANGA;

            results.push({
                id,
                title: titleEnglish ?? titleRomaji ?? titleNative ?? null,
                altTitles: [...altTitles.map((title) => Object.values(title)[0]), ...Object.values(title)],
                img,
                format,
                year,
                providerId: this.id,
            });
        }

        return results;
    }

    override async fetchChapters(id: string): Promise<IChapter[] | undefined> {
        const chapterList: IChapter[] = [];

        for (let page = 0, run = true; run; page++) {
            const request = await this.request(
                `${this.api}/manga/${id}/feed?limit=500&translatedLanguage%5B%5D=en&includes[]=scanlation_group&includes[]=user&order[volume]=desc&order[chapter]=desc&offset=${500 * page}&contentRating[]=safe&contentRating[]=suggestive&contentRating[]=erotica&contentRating[]=pornographic`,
            ).catch(() => {
                return null;
            });
            if (!request) {
                run = false;
                break;
            }

            const data = (await request.json()) as {
                result: string;
                errors: { id: string; status: string; code: string; title: string; detail: string }[];
                data: { [key: string]: { id: string; type: string; attributes: { title: string | null; volume: string; chapter: string; updatedAt: string } } };
            };

            if (!data || !data.result) {
                run = false;
                break;
            }

            if (data.result === "error") {
                const error = data.errors[0];
                throw new Error(error.detail);
            }

            const chapters: IChapter[] = [];
            Object.keys(data.data).map((chapter) => {
                const curChapter = data.data[chapter];
                const id = curChapter.id;
                let title = "";

                if (curChapter.attributes.volume) {
                    title += "Vol. " + this.padNum(curChapter.attributes.volume, 2) + " ";
                }
                if (curChapter.attributes.chapter) {
                    title += "Ch. " + this.padNum(curChapter.attributes.chapter, 2) + " ";
                }

                if (title.length === 0) {
                    if (!curChapter.attributes.title) {
                        title = "Oneshot";
                    } else {
                        title = curChapter.attributes.title;
                    }
                }

                let canPush = true;
                for (let i = 0; i < chapters.length; i++) {
                    if (chapters[i].title?.trim() === title?.trim()) {
                        canPush = false;
                    }
                }

                if (canPush) {
                    chapters.push({
                        id,
                        title: title?.trim(),
                        number: Number(curChapter.attributes.chapter),
                        updatedAt: new Date(curChapter.attributes.updatedAt ?? 0).getTime(),
                        rating: null,
                    });
                }
            });

            if (chapters.length > 0) {
                chapterList.push(...chapters);
            } else {
                run = false;
            }
        }

        return chapterList;
    }

    override async fetchPages(id: string): Promise<IPage[] | string | undefined> {
        const req = await this.request(`${this.api}/at-home/server/${id}`).catch(() => {
            return null;
        });

        if (!req) {
            return [];
        }

        const data = (await req.json()) as { baseUrl: string; chapter: { hash: string; data: string[] } };

        const baseUrl = data.baseUrl;
        const hash = data.chapter.hash;

        const pages: IPage[] = [];
        for (let i = 0; i < data.chapter.data.length; i++) {
            const url = `${baseUrl}/data/${hash}/${data.chapter.data[i]}`;
            pages.push({
                url: url,
                index: i,
                headers: {
                    Referer: this.url,
                },
            });
        }
        return pages;
    }

    override async proxyCheck(proxyURL: string): Promise<boolean | undefined> {
        try {
            const uri = new URL("/manga", this.api);
            uri.searchParams.set("title", "Mushoku Tensei");
            uri.searchParams.set("limit", "25");
            uri.searchParams.set("offset", "0");
            uri.searchParams.set("order[relevance]", "desc");
            uri.searchParams.append("contentRating[]", "safe");
            uri.searchParams.append("contentRating[]", "suggestive");
            uri.searchParams.append("includes[]", "cover_art");

            const { data: mangaList = [] } = (await (
                await this.request(uri.href, {
                    proxy: proxyURL,
                })
            ).json()) as { data: IManga[] };

            return mangaList.length > 0;
        } catch {
            return false;
        }
    }
}

interface IManga {
    id: string;
    type: string;
    attributes: {
        title: {
            [key: string]: string;
        };
        altTitles: {
            [key: string]: string;
        }[];
        description: {
            [key: string]: string;
        };
        isLocked: boolean;
        links: {
            [key: string]: string;
        };
        originalLanguage: string;
        lastVolume: string;
        lastChapter: string;
        publicationDemographic: string;
        status: string;
        year: number;
        contentRating: string;
        tags: {
            id: string;
            type: string;
            attributes: {
                name: {
                    en: string;
                };
                description: {
                    [key: string]: string;
                };
                group: string;
                version: number;
            };
            relationships: {
                id: string;
                type: string;
                related: string;
                attributes: {
                    [key: string]: string;
                };
            }[];
        }[];
        state: string;
        chapterNumbersResetOnNewVolume: boolean;
        createdAt: string;
        updatedAt: string;
        version: number;
        availableTranslatedLanguages: string[];
        latestUploadedChapter: string;
    };
    relationships: {
        id: string;
        type: string;
        related?: string;
        attributes?: {
            description: string;
            volume: string;
            fileName: string;
            locale: string;
            createdAt: string;
            updatedAt: string;
            version: number;
        };
    }[];
}
