import { load } from "cheerio";
import { compareTwoStrings } from "../../../helper/stringSimilarity";
import MangaProvider from ".";
import { Format } from "../../../types/enums";
import { Chapter, Page, Result } from "../../../types/types";

export default class JNovels extends MangaProvider {
    override rateLimit = 250;
    override id = "jnovels";
    override url = "https://jnovels.com";

    override formats: Format[] = [Format.NOVEL];

    override async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        const lightNovels = await (await this.request(`${this.url}/11light-1novel27-pdf/`)).text();
        const novelResults = await this.handleSearchResults(query, lightNovels);

        if (novelResults?.length > 0) return novelResults;

        const webNovels = await (await this.request(`${this.url}/hwebnovels-lista14/`)).text();
        const webResults = await this.handleSearchResults(query, webNovels);

        return webResults;
    }

    private async handleSearchResults(query: string, data: string) {
        const $ = load(data);

        const elements = $("div.post-content ol li").toArray();

        const resultsPromises: Promise<Result>[] = elements.map(async (el) => {
            const item = $(el);
            const id = item.find("a").attr("href")?.split(this.url)[1]!;
            const title = item.find("a").text()?.trim() ?? "";

            // If contains style attribute skip
            if (item.find("a").attr("style")) return {} as Result;

            if (compareTwoStrings(title, query) < 0.5) return {} as Result;

            const pageData = await (await this.request(`${this.url}${id}`, {}, true)).text();
            const $$ = load(pageData);

            let associated = [];
            if ($$("div#editassociated").length === 0) {
                const associatedNamesLabel = $$('p:contains("Associated Names")').text()?.split("Related Series")[0];
                associated = associatedNamesLabel
                    .split("\n")
                    .slice(1)
                    .map((x) => x.trim());
            } else {
                associated = $$("div#editassociated").text().split("\n");
            }

            return {
                id: id,
                altTitles: associated?.length > 0 ? associated.map((x) => x.trim()).filter((x) => x.length != 0) : [],
                format: Format.NOVEL,
                img: $$("div.featured-media img").attr("src") ?? "",
                providerId: this.id,
                title: title,
                year: 0,
            };
        });

        const results = (await Promise.all(resultsPromises)).filter((x) => x.title);
        return results;
    }

    override async fetchChapters(id: string): Promise<Chapter[] | undefined> {
        const chapters: Chapter[] = [];

        const data = await (await this.request(`${this.url}${id}`)).text();

        const $ = load(data);

        $("main div.post-content ol li").map((i, el) => {
            const id = $(el).find("a").attr("href")!;
            if (id && !id.includes(this.url)) {
                const title = $(el).text()?.split(" ——")[0];
                chapters.push({
                    id: id,
                    title: title?.trim(),
                    number: i + 1,
                });
            }
        });

        return chapters;
    }

    override async fetchPages(id: string): Promise<string | Page[] | undefined> {
        return `No content able to read! You may download the novel <a href="${id}" target="_blank">here</a>.`;
    }
}
