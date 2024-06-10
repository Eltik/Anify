import MangaProvider from ".";
import { Format, Formats } from "../../../types/enums";
import { Chapter, Page, Result } from "../../../types/types";

export default class MangaDex extends MangaProvider {
    override rateLimit = 250;
    override id = "mangadex";
    override url = "https://mangadex.org";

    public needsProxy: boolean = true;

    override formats: Format[] = [Format.MANGA, Format.ONE_SHOT];

    private api = "https://api.mangadex.org";

    override async search(query: string): Promise<Result[] | undefined> {
        const results: Result[] = [];

        let mangaList: any[] = [];

        for (let page = 0; page <= 1; page += 1) {
            const uri = new URL("/manga", this.api);
            uri.searchParams.set("title", query);
            uri.searchParams.set("limit", "25");
            uri.searchParams.set("offset", String(25 * page).toString());
            uri.searchParams.set("order[relevance]", "desc");
            uri.searchParams.append("contentRating[]", "safe");
            uri.searchParams.append("contentRating[]", "suggestive");
            uri.searchParams.append("includes[]", "cover_art");

            const data = (await (await this.request(uri.href)).json()) as { data: any[] };

            mangaList = [...mangaList, ...data.data];
        }

        for (let i = 0; i < mangaList.length; i++) {
            const manga = mangaList[i];
            const attributes = manga.attributes;
            const relationships = manga.relationships;

            const altTitles: string[] = attributes.altTitles
                .map((title: { [key: string]: string }) => {
                    return Object.values(title)[0];
                })
                .concat(Object.values(attributes.title));

            const id = manga.id;
            let img = null;
            relationships.map((element: { id: string; type: string; related: string; attributes: { [key: string]: string } }) => {
                if (element.type === "cover_art") {
                    img = `${this.url}/covers/${id}/${element.id}.jpg.512.jpg`;
                }
            });

            const formatString: string = manga.type.toUpperCase();
            const format: Format = formatString === "ADAPTATION" ? Format.MANGA : Formats.includes(formatString as Format) ? (formatString as Format) : Format.MANGA;

            const title =
                attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "en")?.en ??
                attributes.title[Object.keys(attributes.title).filter((value) => value === "en")[0]] ??
                attributes.title["ja-ro"] ??
                attributes.title["jp-ro"] ??
                attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "ja-ro")?.["ja-ro"] ??
                attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "jp-ro")?.["jp-ro"] ??
                attributes.title["jp"] ??
                attributes.title["ja"] ??
                attributes.title["ko"] ??
                attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "jp")?.jp ??
                attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "ja")?.ja ??
                attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "ko")?.ko ??
                null;

            results.push({
                id,
                title,
                altTitles: altTitles,
                img,
                format,
                year: attributes.year,
                providerId: this.id,
            });
        }
        return results;
    }

    override async fetchChapters(id: string): Promise<Chapter[] | undefined> {
        const chapterList: Chapter[] = [];

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

            const chapters: Chapter[] = [];
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

            chapters.length > 0 ? chapterList.push(...chapters) : (run = false);
        }

        return chapterList;
    }

    override async fetchPages(id: string): Promise<Page[] | string | undefined> {
        const req = await this.request(`${this.api}/at-home/server/${id}`).catch(() => {
            return null;
        });

        if (!req) {
            return [];
        }

        const data = (await req.json()) as { baseUrl: string; chapter: { hash: string; data: string[] } };

        const baseUrl = data.baseUrl;
        const hash = data.chapter.hash;

        const pages: Page[] = [];
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
}
