import { load } from "cheerio";
import MangaProvider from ".";
import { stringSearch } from "../../../helper/title";
import { Format } from "../../../types/enums";
import { Chapter, Page, Result } from "../../../types/types";

export default class MangaSee extends MangaProvider {
    override rateLimit = 250;
    override id = "mangasee";
    override url = "https://mangasee123.com";

    override formats: Format[] = [Format.MANGA, Format.ONE_SHOT];

    override async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        const list = await this.getMangaList();
        const results: Result[] = [];

        for (let i = 0; i < list.length; i++) {
            if (stringSearch(list[i].s, query) >= 0.875) {
                results.push({
                    title: list[i].s,
                    id: `/manga/${list[i].i}`,
                    altTitles: list[i].a,
                    year: 0,
                    img: null,
                    format: Format.UNKNOWN,
                    providerId: this.id,
                });
            }
        }
        return results;
    }

    override async fetchChapters(id: string): Promise<Chapter[] | undefined> {
        const data = await this.request(`${this.url}${id}`);
        const chapters: Chapter[] = [];

        const $ = load(await data.text());

        const mangaId = id.split("/manga/")[1];
        const contentScript = $("body > script:nth-child(16)").get()[0].children[0] as any;

        const chaptersData = this.processScriptTagVariable(contentScript["data"], "vm.Chapters = ");
        chaptersData?.map((i: { [x: string]: any }) => {
            chapters.push({
                id: `/read-online/${mangaId}-chapter-${this.processChapterNumber(i["Chapter"])}`,
                title: `${i["ChapterName"] && i["ChapterName"].length > 0 ? i["ChapterName"] : `Chapter ${this.processChapterNumber(i["Chapter"])}`}`,
                number: parseInt(this.processChapterNumber(i["Chapter"])),
                updatedAt: new Date(i["Date"]).getTime(),
            });
        });

        return chapters;
    }

    override async fetchPages(id: string): Promise<Page[] | string | undefined> {
        const data = await this.request(`${this.url}${id}-page-1.html`);

        const images: Page[] = [];

        const $ = load(await data.text());

        const chapterScript = $("body > script:nth-child(19)").get()[0].children[0] as any;
        const curChapter = this.processScriptTagVariable(chapterScript["data"], "vm.CurChapter = ");
        const imageHost = this.processScriptTagVariable(chapterScript["data"], "vm.CurPathName = ");
        const curChapterLength = Number(curChapter["Page"]);

        for (let i = 0; i < curChapterLength; i++) {
            const chapter = this.processChapterForImageUrl(id.replace(/[^0-9.]/g, ""));
            const page = `${i + 1}`.padStart(3, "0");
            const mangaId = id.split("-chapter-", 1)[0].split("/read-online/")[1];
            const imagePath = `https://${imageHost}/manga/${mangaId}/${chapter}-${page}.png`;

            images.push({
                url: imagePath,
                index: i,
                headers: {
                    Referer: this.url,
                },
            });
        }

        return images;
    }

    private processScriptTagVariable = (script: string, variable: string) => {
        const chopFront = script.substring(script.search(variable) + variable.length, script.length);
        const chapters = JSON.parse(chopFront.substring(0, chopFront.search(";")));

        return chapters;
    };

    private processChapterNumber = (chapter: string): string => {
        const decimal = chapter.substring(chapter.length - 1, chapter.length);
        chapter = chapter.replace(chapter[0], "").slice(0, -1);
        if (decimal == "0") return `${+chapter}`;

        if (chapter.startsWith("0")) chapter = chapter.replace(chapter[0], "");

        return `${+chapter}.${decimal}`;
    };

    private processChapterForImageUrl = (chapter: string): string => {
        if (!chapter.includes(".")) return chapter.padStart(4, "0");

        const values = chapter.split(".");
        const pad = values[0].padStart(4, "0");

        return `${pad}.${values[1]}`;
    };

    private async getMangaList(): Promise<SearchResult[]> {
        const req = await this.request(`${this.url}/_search.php`, {
            method: "POST",
            headers: {
                Referer: this.url,
            },
        });
        const data: [SearchResult] = await req.json();
        return data;
    }
}

interface SearchResult {
    i: string; // image
    s: string; // Main title
    a: [string]; // Alternative titles
}
