import MangaProvider from ".";
import { Format } from "../../../types/enums";
import { Chapter, Page, Result } from "../../../types/types";

export default class ComicK extends MangaProvider {
    override rateLimit = 250;
    override id = "comick";
    override url = "https://comick.app";

    override formats: Format[] = [Format.MANGA, Format.ONE_SHOT];

    // Docs: https://upload.comick.app/docs/static/index.html
    private api = "https://api.comick.fun";

    override async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        const data: SearchResult[] = await (await this.request(`${this.api}/v1.0/search?q=${encodeURIComponent(query)}&limit=25&page=1${year ? `&from=${year}&to=${year}` : ""}`, {}, true)).json();

        const results: Result[] = [];

        for (let i = 0; i < data.length; i++) {
            const result = data[i];

            let cover: any = result.md_covers ? result.md_covers[0] : null;
            if (cover && cover.b2key != undefined) {
                cover = "https://meo.comick.pictures/" + cover.b2key;
            }

            results.push({
                id: result.slug,
                title: result.title ?? result.slug,
                altTitles: result.md_titles ? result.md_titles.map((title) => title.title) : [],
                img: cover,
                format: format ?? Format.UNKNOWN,
                year: result.year ?? 0,
                providerId: this.id,
            });
        }

        return results;
    }

    override async fetchChapters(id: string): Promise<Chapter[] | undefined> {
        const chapterList: Chapter[] = [];

        const comicId = await this.getComicId(`/comic/${id}`);
        if (!comicId) {
            return chapterList;
        }

        const data = await (await this.request(`${this.api}/comic/${comicId}/chapters?lang=en&page=0&limit=1000000`, {}, true))?.json();

        const chapters: Chapter[] = [];

        data.chapters.map((chapter: ComickChapter) => {
            let title = "";

            if (chapter.vol) {
                title += "Vol. " + this.padNum(chapter.vol, 2) + " ";
            }
            if (chapter.chap) {
                title += "Ch. " + this.padNum(chapter.chap, 2) + " ";
            }

            let canPush = true;
            for (let i = 0; i < chapters.length; i++) {
                if (chapters[i].title?.trim() === title?.trim()) {
                    canPush = false;
                }
            }

            if (canPush) {
                const updatedAt = new Date(chapter.updated_at ?? 0).getTime();
                if (chapter.lang === "en") {
                    chapters.push({
                        id: chapter.hid,
                        title: title?.trim(),
                        number: Number(chapter.chap),
                        updatedAt,
                    });
                }
            }
        });

        chapterList.push(...chapters);

        return chapterList;
    }

    override async fetchPages(id: string): Promise<Page[] | string | undefined> {
        const data = await (await this.request(`${this.api}/chapter/${id}`, {}, true))?.json();

        const pages: Page[] = [];

        data.chapter.md_images.map((image: { vol: any; w: number; h: number; b2key: string }, index: number) => {
            pages.push({
                url: `https://meo.comick.pictures/${image.b2key}?width=${image.w}`,
                index: index,
                headers: {},
            });
        });

        return pages;
    }

    private async getComicId(id: string): Promise<string | null> {
        const json = await (await this.request(`${this.api}${id}`, {}, true))?.json();
        const data: Comic = json.comic;
        return data ? data.hid : null;
    }
}

interface SearchResult {
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
    md_covers: { vol: any; w: number; h: number; b2key: string }[];
    highlight: string;
}

interface Comic {
    id: number;
    hid: string;
    title: string;
    country: string;
    status: number;
    links: { al: string; ap: string; bw: string; kt: string; mu: string; amz: string; cdj: string; ebj: string; mal: string; raw: string };
    last_chapter: any;
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
    mismatch: any;
    year: number;
    bayesian_rating: any;
    rating_count: number;
    content_rating: string;
    translation_completed: boolean;
    relate_from: Array<any>;
    mies: any;
    md_titles: { title: string }[];
    md_comic_md_genres: { md_genres: { name: string; type: string | null; slug: string; group: string } }[];
    mu_comics: {
        licensed_in_english: any;
        mu_comic_categories: {
            mu_categories: { title: string; slug: string };
            positive_vote: number;
            negative_vote: number;
        }[];
    };
    md_covers: { vol: any; w: number; h: number; b2key: string }[];
    iso639_1: string;
    lang_name: string;
    lang_native: string;
}

interface ComickChapter {
    id: number;
    chap: string;
    title: string;
    vol: string | null;
    lang: string;
    created_at: string;
    updated_at: string;
    up_count: number;
    down_count: number;
    group_name: any;
    hid: string;
    identities: any;
    md_chapter_groups: { md_groups: { title: string; slug: string } }[];
}
