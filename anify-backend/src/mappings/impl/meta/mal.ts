import { load } from "cheerio";
import MetaProvider from ".";
import { Format, Type } from "../../../types/enums";
import { Result } from "../../../types/types";

export default class MALMeta extends MetaProvider {
    override id = "mal";
    override url = "https://myanimelist.net";

    public needsProxy: boolean = true;

    override rateLimit = 500;
    override formats: Format[] = [Format.TV, Format.MOVIE, Format.ONA, Format.SPECIAL, Format.TV_SHORT, Format.OVA, Format.MANGA, Format.ONE_SHOT, Format.NOVEL];

    override async search(query: string): Promise<Result[] | undefined> {
        const results: Result[] = [];

        const anime = await this.fetchResults(query, Type.ANIME);
        const manga = await this.fetchResults(query, Type.MANGA);

        if (anime) {
            results.push(...anime);
        }

        if (manga) {
            results.push(...manga);
        }

        return results;
    }

    private async fetchResults(query: string, type: Type): Promise<Result[] | undefined> {
        const results: Result[] = [];

        const corsMirror = "https://corsmirror.com";
        const url = `${this.url}/${type === Type.ANIME ? "anime" : "manga"}.php?q=${query}&c[]=a&c[]=b&c[]=c&c[]=f&c[]=d&c[]=e&c[]=g`;
        const data = await (await this.request(`${corsMirror}/v1?url=${encodeURIComponent(url)}`)).text();
        const $ = load(data);

        const searchResults = $("div.js-categories-seasonal table tr").first();

        if (!searchResults.length) {
            return undefined;
        }

        const promises: Promise<void>[] = [];

        searchResults.nextAll().map((_, el) => {
            const id = $("td:nth-child(1) div a", el).attr("id")?.split("sarea")[1] ?? "";
            const title = $("td:nth-child(2) a strong", el).text();
            const img = $("td:nth-child(1) div a img", el).attr("data-src") ?? "";
            const format = $("td:nth-child(3)", el).text()?.trim() ?? "";

            const date = $("td:nth-child(6)", el).text()?.trim();

            promises.push(
                new Promise(async (resolve) => {
                    const data = await (await this.request(`${this.url}/${type === Type.ANIME ? "anime" : "manga"}/${id}`)).text();
                    const $$ = load(data);

                    const published =
                        $$("span:contains('Published:')").length > 0
                            ? $$("span:contains('Published:')").parents().first().text().replace($$("span:contains('Published:')").first().text(), "").replace(/\s+/g, " ").trim() === "?"
                                ? null
                                : $$("span:contains('Published:')").parents().first().text().replace($$("span:contains('Published:')").first().text(), "").replace(/\s+/g, " ").trim()
                            : null;
                    const premiered =
                        $$("span:contains('Premiered:')").length > 0
                            ? $$("span:contains('Premiered:')").parents().first().text().replace($$("span:contains('Premiered:')").first().text(), "").replace(/\s+/g, " ").trim() === "?"
                                ? null
                                : $$("span:contains('Premiered:')").parents().first().text().replace($$("span:contains('Premiered:')").first().text(), "").replace(/\s+/g, " ").trim()
                            : null;

                    const year =
                        type === Type.ANIME
                            ? Number.isNaN(date === "-" ? 0 : new Date(date).getFullYear())
                                ? premiered
                                    ? parseInt(premiered.split(" ")[1]?.split(" ")[0], 10)
                                    : null
                                : date === "-"
                                ? 0
                                : new Date(date).getFullYear()
                            : Number.isNaN(date === "-" ? 0 : new Date(date).getFullYear())
                            ? published
                                ? new Date(published.split(" to")[0]).getFullYear()
                                : null
                            : date === "-"
                            ? 0
                            : new Date(date).getFullYear();

                    const alternativeTitlesDiv = $$("h2:contains('Alternative Titles')").nextUntil("h2:contains('Information')").first();
                    const additionalTitles = alternativeTitlesDiv
                        .find("div.spaceit_pad")
                        .map((_, item) => {
                            return $$(item).text().trim();
                        })
                        .get();
                    const titles = {
                        main: $$("meta[property='og:title']").attr("content") || "",
                        english: $$("span:contains('English:')").length > 0 ? $$("span:contains('English:')").parent().text().replace($$("span:contains('English:')").text(), "").replace(/\s+/g, " ").trim() : null,
                        synonyms: $$("span:contains('Synonyms:')").length > 0 ? $$("span:contains('Synonyms:')").parent().text().replace($$("span:contains('Synonyms:')").text(), "").replace(/\s+/g, " ").trim().split(", ") : [],
                        japanese: $$("span:contains('Japanese:')").length > 0 ? $$("span:contains('Japanese:')").parent().text().replace($$("span:contains('Japanese:')").text(), "").replace(/\s+/g, " ").trim() : null,
                        alternatives: additionalTitles,
                    };

                    const altTitles = [titles.main, titles.english, titles.japanese, ...titles.synonyms, ...titles.alternatives].filter((x) => x !== null && x !== undefined && x !== "");

                    results.push({
                        id,
                        title,
                        altTitles: altTitles as string[],
                        year: year ?? 0,
                        format:
                            format === "Music"
                                ? Format.MUSIC
                                : format === "TV"
                                ? Format.TV
                                : format === "Movie"
                                ? Format.MOVIE
                                : format === "TV Short"
                                ? Format.TV_SHORT
                                : format === "OVA"
                                ? Format.OVA
                                : format === "ONA"
                                ? Format.ONA
                                : format === "Manga"
                                ? Format.MANGA
                                : format === "One-shot"
                                ? Format.ONE_SHOT
                                : format === "Doujinshi"
                                ? Format.MANGA
                                : format === "Light Novel"
                                ? Format.NOVEL
                                : format === "Novel"
                                ? Format.NOVEL
                                : format === "Special"
                                ? Format.SPECIAL
                                : format === "TV Special"
                                ? Format.TV_SHORT
                                : format === "Manhwa"
                                ? Format.MANGA
                                : format === "Manhua"
                                ? Format.MANGA
                                : Format.UNKNOWN,
                        img,
                        providerId: this.id,
                    });

                    resolve();
                }),
            );
        });

        await Promise.all(promises);

        return results;
    }

    override async proxyCheck(): Promise<boolean | undefined> {
        const searchData = await this.search("Mushoku Tensei");
        if (!searchData || searchData.length === 0) {
            return true;
        } else {
            return false;
        }
    }
}
