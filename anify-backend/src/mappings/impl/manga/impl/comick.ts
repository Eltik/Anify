import MangaProvider from "..";
import { type IChapter, type IProviderResult, MediaFormat } from "../../../../types";
import type { IPage } from "../../../../types/impl/mappings/impl/manga";

export default class ComicK extends MangaProvider {
    override rateLimit = 0;
    override maxConcurrentRequests: number = -1;
    override id = "comick";
    override url = "https://comick.cc";

    public needsProxy: boolean = true;
    public useGoogleTranslate: boolean = false;

    override formats: MediaFormat[] = [MediaFormat.MANGA, MediaFormat.ONE_SHOT];

    // Docs: https://upload.comick.cc/docs/static/index.html
    private api = "https://api.comick.fun";

    override async search(query: string, format?: MediaFormat, year?: number): Promise<IProviderResult[] | undefined> {
        const data = (await (
            await this.request(`${this.api}/v1.0/search?q=${encodeURIComponent(query)}&limit=25&page=1${year ? `&from=${year}&to=${year}` : ""}`, {
                validateResponse: async (response) => {
                    if (!response.ok) return false;
                    try {
                        await response.json();
                        return true;
                    } catch {
                        return false;
                    }
                },
            })
        ).json()) as ISearchResult[];

        const results: IProviderResult[] = [];

        for (let i = 0; i < data.length; i++) {
            const result = data[i];

            let cover: string | null = null;
            if (result.md_covers && result.md_covers.length > 0) {
                cover = "https://meo.comick.pictures/" + result.md_covers[0].b2key;
            }

            results.push({
                id: result.slug,
                title: result.title ?? result.slug,
                altTitles: result.md_titles ? result.md_titles.map((title) => title.title).concat(result.title) : result.title ? [result.title] : [],
                img: cover,
                format: MediaFormat.UNKNOWN,
                year: result.year ?? 0,
                providerId: this.id,
            });
        }

        return results;
    }

    override async fetchChapters(id: string): Promise<IChapter[] | undefined> {
        const chapterList: IChapter[] = [];

        const comicId = await this.getComicId(`/comic/${id}`);
        if (!comicId) {
            return chapterList;
        }

        const data = (await (
            await this.request(`${this.api}/comic/${comicId}/chapters?lang=en&page=0&limit=1000000`, {
                validateResponse: async (response) => {
                    if (!response.ok) return false;
                    try {
                        const data = (await response.json()) as { chapters?: IComickChapter[] };
                        return data?.chapters !== undefined;
                    } catch {
                        return false;
                    }
                },
            })
        )?.json()) as { chapters: IComickChapter[] };

        const chapters: IChapter[] = [];

        data.chapters.map((chapter: IComickChapter) => {
            let title = "";

            if (chapter.vol) {
                title += "Vol. " + this.padNum(chapter.vol, 2) + " ";
            }
            if (chapter.chap) {
                title += "Ch. " + this.padNum(chapter.chap, 2) + " ";
            }

            if (title.length === 0) {
                if (!chapter.title) {
                    title = "Oneshot";
                } else {
                    title = chapter.title;
                }
            }

            let canPush = true;
            for (let i = 0; i < chapters.length; i++) {
                if (chapters[i].title?.trim() === title?.trim()) {
                    canPush = false;
                }
            }

            if (canPush) {
                if (chapter.lang === "en") {
                    chapters.push({
                        id: chapter.hid,
                        title: title?.trim(),
                        number: Number(chapter.chap),
                        rating: chapter.up_count - chapter.down_count,
                        updatedAt: chapter.updated_at ? new Date(chapter.updated_at ?? 0).getTime() : undefined,
                    });
                }
            }
        });

        chapterList.push(...chapters);

        return chapterList;
    }

    override async fetchPages(id: string): Promise<IPage[] | string | undefined> {
        const data = (await (
            await this.request(`${this.api}/chapter/${id}`, {
                validateResponse: async (response) => {
                    if (!response.ok) return false;
                    try {
                        const data = (await response.json()) as { chapter?: { md_images: { w: number; h: number; b2key: string }[] } };
                        return data?.chapter !== undefined;
                    } catch {
                        return false;
                    }
                },
            })
        )?.json()) as { chapter: { md_images: { w: number; h: number; b2key: string }[] } };

        const pages: IPage[] = [];

        data.chapter.md_images.map((image, index: number) => {
            pages.push({
                url: `https://meo.comick.pictures/${image.b2key}?width=${image.w}`,
                index: index,
                headers: {},
            });
        });

        return pages;
    }

    private async getComicId(id: string): Promise<string | null> {
        const json = (await (
            await this.request(`${this.api}${id}`, {
                validateResponse: async (response) => {
                    if (!response.ok) return false;
                    try {
                        const data = (await response.json()) as { comic?: IComic };
                        return data?.comic !== undefined;
                    } catch {
                        return false;
                    }
                },
            })
        ).json()) as { comic: IComic };
        const data: IComic = json.comic;
        return data ? data.hid : null;
    }

    override async proxyCheck(proxyURL: string): Promise<boolean | undefined> {
        try {
            const data = (await (
                await this.request(`${this.api}/v1.0/search?q=${encodeURIComponent("Mushoku Tensei")}&limit=25`, {
                    proxy: proxyURL,
                })
            ).json()) as ISearchResult[];

            const results: IProviderResult[] = [];

            for (let i = 0; i < data.length; i++) {
                const result = data[i];

                let cover: string | null = null;
                if (result.md_covers && result.md_covers.length > 0) {
                    cover = "https://meo.comick.pictures/" + result.md_covers[0].b2key;
                }

                results.push({
                    id: result.slug,
                    title: result.title ?? result.slug,
                    altTitles: result.md_titles ? result.md_titles.map((title) => title.title).concat(result.title) : result.title ? [result.title] : [],
                    img: cover,
                    format: MediaFormat.UNKNOWN,
                    year: result.year ?? 0,
                    providerId: this.id,
                });
            }

            return results.length > 0;
        } catch {
            return false;
        }
    }
}

interface ISearchResult {
    title: string;
    id: number;
    slug: string;
    year?: number;
    rating: string;
    rating_count: number;
    follow_count: number;
    user_follow_count: number;
    content_rating: string;
    created_at: string;
    demographic: number;
    md_titles: { title: string }[];
    md_covers: { w: number; h: number; b2key: string }[];
    highlight: string;
}

interface IComic {
    id: number;
    hid: string;
    title: string;
    country: string;
    status: number;
    links: {
        al: string;
        ap: string;
        bw: string;
        kt: string;
        mu: string;
        amz: string;
        cdj: string;
        ebj: string;
        mal: string;
        raw: string;
    };
    last_chapter: number;
    chapter_count: number;
    demographic: number;
    hentai: boolean;
    user_follow_count: number;
    follow_rank: number;
    comment_count: number;
    follow_count: number;
    desc: string;
    parsed: string;
    slug: string;
    mismatch: boolean | null;
    year: number;
    bayesian_rating: string;
    rating_count: number;
    content_rating: string;
    translation_completed: boolean;
    relate_from: {
        relate_to: {
            slug: string;
            title: string;
        };
        md_relates: {
            name: string;
        };
    }[];
    md_titles: { title: string; lang?: string }[];
    md_comic_md_genres: { md_genres: { name: string; type: string | null; slug: string; group: string } }[];
    mu_comics: {
        licensed_in_english: boolean;
        mu_comic_categories: {
            mu_categories: { title: string; slug: string };
            positive_vote: number;
            negative_vote: number;
        }[];
    };
    md_covers: { vol: string; w: number; h: number; b2key: string }[];
    iso639_1: string;
    lang_name: string;
    lang_native: string;
}

interface IComickChapter {
    id: number;
    chap: string;
    title: string;
    vol: string | null;
    lang: string;
    created_at: string;
    updated_at: string;
    up_count: number;
    down_count: number;
    is_the_last_chapter: boolean;
    publish_at: string;
    group_name: string[];
    hid: string;
    identities: null;
    md_chapter_groups: { md_groups: { title: string; slug: string } }[];
}
