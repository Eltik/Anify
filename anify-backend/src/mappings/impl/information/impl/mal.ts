import { load } from "cheerio";
import InformationProvider from "..";
import { MediaFormat, MediaSeason, MediaStatus, MediaType, ProviderType } from "../../../../types";
import type { IAnime } from "../../../../types/impl/database/impl/schema/anime";
import type { IManga } from "../../../../types/impl/database/impl/schema/manga";
import type { AnimeInfo, MangaInfo, MediaInfoKeys } from "../../../../types/impl/mappings/impl/mediaInfo";
import type { IRelations } from "../../../../types/impl/database/impl/mappings";

export default class MALInformation extends InformationProvider<IAnime | IManga, AnimeInfo | MangaInfo> {
    override id = "mal";
    override url = "https://myanimelist.net";

    public needsProxy: boolean = true;
    public useGoogleTranslate: boolean = false;

    override rateLimit = 0;
    override maxConcurrentRequests: number = -1;

    override formats: MediaFormat[] = [MediaFormat.TV, MediaFormat.MOVIE, MediaFormat.ONA, MediaFormat.SPECIAL, MediaFormat.TV_SHORT, MediaFormat.OVA, MediaFormat.MANGA, MediaFormat.ONE_SHOT, MediaFormat.NOVEL];

    override get priorityArea(): MediaInfoKeys[] {
        return [];
    }

    override get sharedArea(): MediaInfoKeys[] {
        return ["synonyms", "genres", "artwork"];
    }

    override async info(media: IAnime | IManga): Promise<AnimeInfo | MangaInfo | undefined> {
        const malId = media.mappings.find((data) => {
            return data.providerId === "mal";
        })?.id;

        if (!malId) return undefined;

        switch (media.type) {
            case MediaType.ANIME:
                return this.fetchAnime(malId);
            case MediaType.MANGA:
                return this.fetchManga(malId);
            default:
                return undefined;
        }
    }

    private formatMapping = {
        Music: MediaFormat.MUSIC,
        TV: MediaFormat.TV,
        Movie: MediaFormat.MOVIE,
        "TV Short": MediaFormat.TV_SHORT,
        OVA: MediaFormat.OVA,
        ONA: MediaFormat.ONA,
        Manga: MediaFormat.MANGA,
        "One-shot": MediaFormat.ONE_SHOT,
        Doujinshi: MediaFormat.MANGA,
        "Light Novel": MediaFormat.NOVEL,
        Novel: MediaFormat.NOVEL,
        Special: MediaFormat.SPECIAL,
        "TV Special": MediaFormat.TV_SHORT,
        Manhwa: MediaFormat.MANGA,
        Manhua: MediaFormat.MANGA,
        default: MediaFormat.UNKNOWN,
    };

    private async fetchAnime(id: string, proxyURL: string = ""): Promise<AnimeInfo | undefined> {
        const data = await (
            await this.request(`${this.url}/anime/${id}`, {
                proxy: proxyURL,
            })
        ).text();

        const $ = load(data);

        const alternativeTitlesDiv = $("h2:contains('Alternative Titles')").nextUntil("h2:contains('Information')").first();
        const additionalTitles = alternativeTitlesDiv
            .find("div.spaceit_pad")
            .map((_, item) => {
                return $(item).text().trim();
            })
            .get();

        const title = {
            main: $("meta[property='og:title']").attr("content") || "",
            english: $("span:contains('English:')").length > 0 ? $("span:contains('English:')").parent().text().replace($("span:contains('English:')").text(), "").replace(/\s+/g, " ").trim() : null,
            synonyms: $("span:contains('Synonyms:')").length > 0 ? $("span:contains('Synonyms:')").parent().text().replace($("span:contains('Synonyms:')").text(), "").replace(/\s+/g, " ").trim().split(", ") : [],
            japanese: $("span:contains('Japanese:')").length > 0 ? $("span:contains('Japanese:')").parent().text().replace($("span:contains('Japanese:')").text(), "").replace(/\s+/g, " ").trim() : null,
            alternatives: additionalTitles,
        };

        const imageURL = $("meta[property='og:image']").attr("content") || "";

        let synopsis: string | null = ($("p[itemprop='description']").html() || "").replace(/\s+/g, " ").trim();
        if (synopsis.startsWith("No synopsis information has been added to this title.")) {
            synopsis = null;
        }

        const format = $("span:contains('Type:')").length > 0 ? $("span:contains('Type:')").parents().first().text().replace($("span:contains('Type:')").first().text(), "").trim().replace(/\s+/g, " ").trim() : null;
        const episodes =
            $("span:contains('Episodes:')").length > 0
                ? $("span:contains('Episodes:')").parents().first().text().replace($("span:contains('Episodes:')").first().text(), "").trim() === "Unknown"
                    ? null
                    : parseInt($("span:contains('Episodes:')").parents().first().text().replace($("span:contains('Episodes:')").first().text(), "").trim(), 10)
                : null;
        const status = $("span:contains('Status:')").length > 0 ? $("span:contains('Status:')").parents().first().text().replace($("span:contains('Status:')").first().text(), "").replace(/\s+/g, " ").trim() : null;
        const genres =
            $("span:contains('Genres:')").length > 0 && $("span:contains('Genres:')").parents().first().text().indexOf("No genres have been added yet") === -1
                ? $("span:contains('Genres:')")
                      .parents()
                      .first()
                      .find("a")
                      .map((_, el) => $(el).text().trim())
                      .get()
                : $("span:contains('Genre:')").length > 0 && $("span:contains('Genre:')").parents().first().text().indexOf("No genres have been added yet") === -1
                  ? $("span:contains('Genre:')")
                        .parents()
                        .first()
                        .find("a")
                        .map((_, el) => $(el).text().trim())
                        .get()
                  : [];
        const explicitGenres =
            $("span:contains('Explicit Genres:')").length > 0 && $("span:contains('Explicit Genres:')").parents().first().text().indexOf("No genres have been added yet") === -1
                ? $("span:contains('Explicit Genres:')")
                      .parents()
                      .first()
                      .find("a")
                      .map((_, el) => $(el).text().trim())
                      .get()
                : $("span:contains('Explicit Genre:')").length > 0 && $("span:contains('Explicit Genre:')").parents().first().text().indexOf("No genres have been added yet") === -1
                  ? $("span:contains('Explicit Genre:')")
                        .parents()
                        .first()
                        .find("a")
                        .map((_, el) => $(el).text().trim())
                        .get()
                  : [];
        const score =
            $("span[itemprop='ratingValue']").length > 0
                ? (() => {
                      const cleanedScore = $("span[itemprop='ratingValue']").text().trim();
                      return cleanedScore === "N/A" ? null : parseFloat(cleanedScore);
                  })()
                : null;
        const popularity = $("span:contains('Popularity:')").length > 0 ? $("span:contains('Popularity:')").parents().first().text().replace($("span:contains('Popularity:')").text(), "").replace("#", "").trim() : null;
        const premiered =
            $("span:contains('Premiered:')").length > 0
                ? $("span:contains('Premiered:')").parents().first().text().replace($("span:contains('Premiered:')").first().text(), "").replace(/\s+/g, " ").trim() === "?"
                    ? null
                    : $("span:contains('Premiered:')").parents().first().text().replace($("span:contains('Premiered:')").first().text(), "").replace(/\s+/g, " ").trim()
                : null;
        const duration = $("span:contains('Duration:')").length > 0 ? $("span:contains('Duration:')").parents().first().text().replace($("span:contains('Duration:')").text(), "").replace(".", "").trim() : null;
        const preview = $("div.video-promotion a").length > 0 ? $("div.video-promotion a").attr("href") || null : null;
        const themes =
            $("span:contains('Themes:')").length > 0 && $("span:contains('Themes:')").parents().first().text().indexOf("No themes have been added yet") === -1
                ? $("span:contains('Themes:')")
                      .parents()
                      .first()
                      .find("a")
                      .map((_, el) => $(el).text().trim())
                      .get()
                : $("span:contains('Themes:')").length > 0 && $("span:contains('Themes:')").parents().first().text().indexOf("No themes have been added yet") === -1
                  ? $("span:contains('Themes:')")
                        .parents()
                        .first()
                        .find("a")
                        .map((_, el) => $(el).text().trim())
                        .get()
                  : [];

        const seasonString = premiered ? premiered.split(" ")[0] : null;
        let season: MediaSeason = MediaSeason.UNKNOWN;

        switch (seasonString ?? "") {
            case "Winter":
                season = MediaSeason.WINTER;
                break;
            case "Spring":
                season = MediaSeason.SPRING;
                break;
            case "Summer":
                season = MediaSeason.SUMMER;
                break;
            case "Fall":
                season = MediaSeason.FALL;
                break;
            default:
                season = MediaSeason.UNKNOWN;
                break;
        }

        const relations: IRelations[] = [];
        const promises: Promise<void>[] = [];

        $("div.related-entries div.entries-tile div.entry").each((i, el) => {
            const relationElement = $(el).find("div.content div.relation");
            if (!relationElement.length) return;

            const relation = relationElement
                .text()
                .replace(/\s\(.*\)/, "")
                .trim();
            const links = $(el).find("div.content div.title a");

            links.each((_, link) => {
                if (!$(link).text().trim()) {
                    $(link).remove();
                }
            });

            for (const link of links) {
                promises.push(
                    new Promise(async (resolve) => {
                        const url = $(link).attr("href");

                        const data = await (
                            await this.request(url ?? "", {
                                proxy: proxyURL,
                            })
                        ).text();
                        const $$ = load(data);

                        const id = $$("meta[property='og:url']").attr("content")?.split("/")[4] ?? "";
                        const type = $$("meta[property='og:url']").attr("content")?.split("/")[3] === "manga" ? MediaType.MANGA : MediaType.ANIME;
                        const format = $$("span:contains('Type:')").length > 0 ? $$("span:contains('Type:')").parents().first().text().replace($$("span:contains('Type:')").first().text(), "").trim().replace(/\s+/g, " ").trim() : null;
                        const alternativeTitlesDiv = $$("h2:contains('Alternative Titles')").nextUntil("h2:contains('Information')").first();
                        const additionalTitles = alternativeTitlesDiv
                            .find("div.spaceit_pad")
                            .map((_, item) => {
                                return $$(item).text().trim();
                            })
                            .get();

                        const title = {
                            main: $$("meta[property='og:title']").attr("content") || "",
                            english: $$("span:contains('English:')").length > 0 ? $$("span:contains('English:')").parent().text().replace($$("span:contains('English:')").text(), "").replace(/\s+/g, " ").trim() : null,
                            synonyms: $$("span:contains('Synonyms:')").length > 0 ? $$("span:contains('Synonyms:')").parent().text().replace($$("span:contains('Synonyms:')").text(), "").replace(/\s+/g, " ").trim().split(", ") : [],
                            japanese: $$("span:contains('Japanese:')").length > 0 ? $$("span:contains('Japanese:')").parent().text().replace($$("span:contains('Japanese:')").text(), "").replace(/\s+/g, " ").trim() : null,
                            alternatives: additionalTitles,
                        };

                        relations.push({
                            id,
                            format: this.formatMapping[format as keyof typeof this.formatMapping] ?? this.formatMapping["default"],
                            relationType: relation,
                            title: {
                                english: title.english,
                                native: title.japanese,
                                romaji: title.main,
                            },
                            type,
                        });

                        resolve();
                    }),
                );
            }
        });

        $("table.entries-table tr").each((i, el) => {
            const relation = $(el).find("td:first-child").text().replace(":", "").trim();
            const links = $(el).find("td:nth-child(2) a");

            links.each((_, link) => {
                if (!$(link).text().trim()) {
                    $(link).remove();
                }
            });

            for (const link of links) {
                promises.push(
                    new Promise(async (resolve) => {
                        const url = $(link).attr("href");

                        const data = await (
                            await this.request(url ?? "", {
                                proxy: proxyURL,
                            })
                        ).text();
                        const $$ = load(data);

                        const id = $$("meta[property='og:url']").attr("content")?.split("/")[4] ?? "";
                        const type = $$("meta[property='og:url']").attr("content")?.split("/")[3] === "manga" ? MediaType.MANGA : MediaType.ANIME;
                        const format = $$("span:contains('Type:')").length > 0 ? $$("span:contains('Type:')").parents().first().text().replace($$("span:contains('Type:')").first().text(), "").trim().replace(/\s+/g, " ").trim() : null;
                        const alternativeTitlesDiv = $$("h2:contains('Alternative Titles')").nextUntil("h2:contains('Information')").first();
                        const additionalTitles = alternativeTitlesDiv
                            .find("div.spaceit_pad")
                            .map((_, item) => {
                                return $$(item).text().trim();
                            })
                            .get();

                        const title = {
                            main: $$("meta[property='og:title']").attr("content") || "",
                            english: $$("span:contains('English:')").length > 0 ? $$("span:contains('English:')").parent().text().replace($$("span:contains('English:')").text(), "").replace(/\s+/g, " ").trim() : null,
                            synonyms: $$("span:contains('Synonyms:')").length > 0 ? $$("span:contains('Synonyms:')").parent().text().replace($$("span:contains('Synonyms:')").text(), "").replace(/\s+/g, " ").trim().split(", ") : [],
                            japanese: $$("span:contains('Japanese:')").length > 0 ? $$("span:contains('Japanese:')").parent().text().replace($$("span:contains('Japanese:')").text(), "").replace(/\s+/g, " ").trim() : null,
                            alternatives: additionalTitles,
                        };

                        relations.push({
                            id,
                            format: this.formatMapping[format as keyof typeof this.formatMapping] ?? this.formatMapping["default"],
                            relationType: relation,
                            title: {
                                english: title.english,
                                native: title.japanese,
                                romaji: title.main,
                            },
                            type,
                        });

                        resolve();
                    }),
                );
            }
        });

        await Promise.all(promises);

        /*
        // Unused data
        const approved = $("#addtolist span").filter((_, el) => $(el).text().toLowerCase().includes("pending approval")).length === 0;
        const broadcasted = $("span:contains('Broadcast:')").length > 0 ? ($("span:contains('Broadcast:')").parents().first().text().replace($("span:contains('Broadcast:')").first().text(), "")).replace(/\s+/g, " ").trim() : null;
        const producers = $("span:contains('Producers:')").length > 0 && !$("span:contains('Producers:')").parents().first().text().includes("None found") ? $("span:contains('Producers:')").parents().first().find("a").map((_, el) => { return $(el).text().trim(); }).get() : [];
        const licensors = $("span:contains('Licensors:')").length > 0 && !$("span:contains('Licensors:')").parents().first().text().includes("None found") ? $("span:contains('Licensors:')").parents().first().find("a").map((_, el) => { return $(el).text().trim(); }).get() : [];
        const studios = $("span:contains('Studios:')").length > 0 && $("span:contains('Studios:')").parents().first().text().indexOf("None found") === -1 ? $("span:contains('Studios:')").parents().first().find('a').map((_, el) => $(el).text().trim()).get() : [];
        const source = $("span:contains('Source:')").length > 0 ? $("span:contains('Source:')").parents().first().text().replace($("span:contains('Source:')").first().text(), "").trim() : null;
        const demographics = $("span:contains('Demographic:')").length > 0 ? $("span:contains('Demographic:')").parents().first().find("a").map((_, el) => $(el).text().trim()).get() : $("span:contains('Demographics:')").length > 0 ? $("span:contains('Demographics:')").parents().first().find("a").map((_, el) => $(el).text().trim()).get() : [];
        const themes = $("span:contains('Theme:')").length > 0 ? $("span:contains('Theme:')").parents().first().find("a").map((_, el) => $(el).text().trim()).get() : $("span:contains('Themes:')").length > 0 ? $("span:contains('Themes:')").parents().first().find("a").map((_, el) => $(el).text().trim()).get() : [];
        const rating = $("span:contains('Rating:')").length > 0 ? (() => {
                const cleanedRating = $("span:contains('Rating:')").parents().first().text().replace($("span:contains('Rating:')").text(), "").trim();
                return cleanedRating === "None" ? null : cleanedRating;
            })()
            : null;
        const scoredBy = $("span[itemprop='ratingCount']").length > 0 ? (() => {
                const cleanedScoredBy = $("span[itemprop='ratingCount']").text().trim();
                const numericValue = cleanedScoredBy.replace(/[, ]+(user|users)/g, "");
                return isNaN(Number(numericValue)) ? null : parseInt(numericValue, 10);
            })()
            : null;
        const rank = $("span:contains('Ranked:')").length > 0 ? (() => {
                const rankedText = $("span:contains('Ranked:')")
                    .parents()
                    .first()
                    .text()
                    .replace($("span:contains('Ranked:')").text(), "")
                    .trim();
                const cleanedRanked = rankedText.replace("#", "");
                return cleanedRanked === "N/A" ? null : parseInt(cleanedRanked, 10);
            })()
            : null;
        const members = $("span:contains('Members:')").length > 0 ? parseInt($("span:contains('Members:')").parents().first().text().replace($("span:contains('Members:')").first().text(), "").replace(/,/g, "").trim()) : null;
        const favorites = $("span:contains('Favorites:')").length > 0 ? parseInt($("span:contains('Favorites:')").parents().first().text().replace($("span:contains('Favorites:')").first().text(), "").replace(/,/g, "").trim()) : null;

        const background = $("p[itemprop='description']").length > 0 ? $("p[itemprop='description']").parents().first().text().replace(/\s+/g, " ").trim().replace(/No background information has been added to this title/, "") || null : null;
        const openingThemes = $("div.theme-songs.js-theme-songs.opnening table tr").length > 0 ? $("div.theme-songs.js-theme-songs.opnening table tr").map((i, el) => $(el).text().replace(/\s+/g, " ").trim()).get() : [];
        const endingThemes = $("div.theme-songs.js-theme-songs.ending table tr").length > 0 ? $("div.theme-songs.js-theme-songs.ending table tr").map((i, el) => $(el).text().replace(/\s+/g, " ").trim()).get() : [];
        const aired = $("span:contains('Aired')").length > 0 ? $("span:contains('Aired')").parent().html()?.split('\n').map(line => line.trim())[1] || null : null;
        */

        return {
            id,
            title: {
                english: title.english,
                native: title.japanese,
                romaji: title.main,
            },
            synonyms: title.synonyms.concat(title.alternatives),
            description: synopsis,
            type: MediaType.ANIME,
            rating: score ? score : null,
            popularity: popularity ? parseInt(popularity, 10) : null,
            format: this.formatMapping[format as keyof typeof this.formatMapping] ?? this.formatMapping["default"],
            totalEpisodes: episodes ? episodes : null,
            status: status === "Finished Airing" ? MediaStatus.FINISHED : status === "Currently Airing" ? MediaStatus.RELEASING : MediaStatus.NOT_YET_RELEASED,
            coverImage: imageURL,
            genres: genres.concat(explicitGenres),
            relations,
            year: premiered ? parseInt(premiered.split(" ")[1].split(" ")[0], 10) : null,
            duration: duration ? parseInt(duration.split(" ")[0], 10) : null,
            trailer: preview ? (new URL(preview).searchParams.get("u") ?? null) : null,
            artwork: [],
            bannerImage: null,
            characters: [],
            color: null,
            countryOfOrigin: null,
            currentEpisode: null,
            season,
            tags: themes,
        };
    }

    private async fetchManga(id: string, proxyURL: string = ""): Promise<MangaInfo | undefined> {
        const data = await (
            await this.request(`${this.url}/manga/${id}`, {
                proxy: proxyURL,
            })
        ).text();

        const $ = load(data);

        const alternativeTitlesDiv = $("h2:contains('Alternative Titles')").nextUntil("h2:contains('Information')").first();
        const additionalTitles = alternativeTitlesDiv
            .find("div.spaceit_pad")
            .map((_, item) => {
                return $(item).text().trim();
            })
            .get();

        const title = {
            main: $("meta[property='og:title']").attr("content") || "",
            english: $("span:contains('English:')").length > 0 ? $("span:contains('English:')").parent().text().replace($("span:contains('English:')").text(), "").replace(/\s+/g, " ").trim() : null,
            synonyms: $("span:contains('Synonyms:')").length > 0 ? $("span:contains('Synonyms:')").parent().text().replace($("span:contains('Synonyms:')").text(), "").replace(/\s+/g, " ").trim().split(", ") : [],
            japanese: $("span:contains('Japanese:')").length > 0 ? $("span:contains('Japanese:')").parent().text().replace($("span:contains('Japanese:')").text(), "").replace(/\s+/g, " ").trim() : null,
            alternatives: additionalTitles,
        };

        const imageURL = $("meta[property='og:image']").attr("content") || "";

        let synopsis: string | null = ($("span[itemprop='description']").html() || "").replace(/\s+/g, " ").trim();
        if (synopsis.startsWith("No synopsis information has been added to this title.")) {
            synopsis = null;
        }

        const format = $("span:contains('Type:')").length > 0 ? $("span:contains('Type:')").parents().first().text().replace($("span:contains('Type:')").first().text(), "").trim().replace(/\s+/g, " ").trim() : null;
        const volumes =
            $("span:contains('Volumes:')").length > 0
                ? $("span:contains('Volumes:')").parents().first().text().replace($("span:contains('Volumes:')").first().text(), "").trim() === "Unknown"
                    ? null
                    : parseInt($("span:contains('Volumes:')").parents().first().text().replace($("span:contains('Volumes:')").first().text(), "").trim(), 10)
                : null;
        const chapters =
            $("span:contains('Chapters:')").length > 0
                ? $("span:contains('Chapters:')").parents().first().text().replace($("span:contains('Chapters:')").first().text(), "").trim() === "Unknown"
                    ? null
                    : parseInt($("span:contains('Chapters:')").parents().first().text().replace($("span:contains('Chapters:')").first().text(), "").trim(), 10)
                : null;
        const status = $("span:contains('Status:')").length > 0 ? $("span:contains('Status:')").parents().first().text().replace($("span:contains('Status:')").first().text(), "").replace(/\s+/g, " ").trim() : null;
        const genres =
            $("span:contains('Genres:')").length > 0 && $("span:contains('Genres:')").parents().first().text().indexOf("No genres have been added yet") === -1
                ? $("span:contains('Genres:')")
                      .parents()
                      .first()
                      .find("a")
                      .map((_, el) => $(el).text().trim())
                      .get()
                : $("span:contains('Genre:')").length > 0 && $("span:contains('Genre:')").parents().first().text().indexOf("No genres have been added yet") === -1
                  ? $("span:contains('Genre:')")
                        .parents()
                        .first()
                        .find("a")
                        .map((_, el) => $(el).text().trim())
                        .get()
                  : [];
        const explicitGenres =
            $("span:contains('Explicit Genres:')").length > 0 && $("span:contains('Explicit Genres:')").parents().first().text().indexOf("No genres have been added yet") === -1
                ? $("span:contains('Explicit Genres:')")
                      .parents()
                      .first()
                      .find("a")
                      .map((_, el) => $(el).text().trim())
                      .get()
                : $("span:contains('Explicit Genre:')").length > 0 && $("span:contains('Explicit Genre:')").parents().first().text().indexOf("No genres have been added yet") === -1
                  ? $("span:contains('Explicit Genre:')")
                        .parents()
                        .first()
                        .find("a")
                        .map((_, el) => $(el).text().trim())
                        .get()
                  : [];
        const score =
            $("span[itemprop='ratingValue']").length > 0
                ? (() => {
                      const cleanedScore = $("span[itemprop='ratingValue']").text().trim();
                      return cleanedScore === "N/A" ? null : parseFloat(cleanedScore);
                  })()
                : null;
        const popularity = $("span:contains('Popularity:')").length > 0 ? $("span:contains('Popularity:')").parents().first().text().replace($("span:contains('Popularity:')").text(), "").replace("#", "").trim() : null;
        const published =
            $("span:contains('Published:')").length > 0
                ? $("span:contains('Published:')").parents().first().text().replace($("span:contains('Published:')").first().text(), "").replace(/\s+/g, " ").trim() === "?"
                    ? null
                    : $("span:contains('Published:')").parents().first().text().replace($("span:contains('Published:')").first().text(), "").replace(/\s+/g, " ").trim()
                : null;
        const themes =
            $("span:contains('Themes:')").length > 0 && $("span:contains('Themes:')").parents().first().text().indexOf("No themes have been added yet") === -1
                ? $("span:contains('Themes:')")
                      .parents()
                      .first()
                      .find("a")
                      .map((_, el) => $(el).text().trim())
                      .get()
                : $("span:contains('Themes:')").length > 0 && $("span:contains('Themes:')").parents().first().text().indexOf("No themes have been added yet") === -1
                  ? $("span:contains('Themes:')")
                        .parents()
                        .first()
                        .find("a")
                        .map((_, el) => $(el).text().trim())
                        .get()
                  : [];

        const relations: IRelations[] = [];
        const promises: Promise<void>[] = [];

        $("div.related-entries div.entries-tile div.entry").each((i, el) => {
            const relationElement = $(el).find("div.content div.relation");
            if (!relationElement.length) return;

            const relation = relationElement
                .text()
                .replace(/\s\(.*\)/, "")
                .trim();
            const links = $(el).find("div.content div.title a");

            links.each((_, link) => {
                if (!$(link).text().trim()) {
                    $(link).remove();
                }
            });

            for (const link of links) {
                promises.push(
                    new Promise(async (resolve) => {
                        const url = $(link).attr("href");

                        const data = await (
                            await this.request(url ?? "", {
                                proxy: proxyURL,
                            })
                        ).text();
                        const $$ = load(data);

                        const id = $$("meta[property='og:url']").attr("content")?.split("/")[4] ?? "";
                        const type = $$("meta[property='og:url']").attr("content")?.split("/")[3] === "manga" ? MediaType.MANGA : MediaType.ANIME;
                        const format = $$("span:contains('Type:')").length > 0 ? $$("span:contains('Type:')").parents().first().text().replace($$("span:contains('Type:')").first().text(), "").trim().replace(/\s+/g, " ").trim() : null;
                        const alternativeTitlesDiv = $$("h2:contains('Alternative Titles')").nextUntil("h2:contains('Information')").first();
                        const additionalTitles = alternativeTitlesDiv
                            .find("div.spaceit_pad")
                            .map((_, item) => {
                                return $$(item).text().trim();
                            })
                            .get();

                        const title = {
                            main: $$("meta[property='og:title']").attr("content") || "",
                            english: $$("span:contains('English:')").length > 0 ? $$("span:contains('English:')").parent().text().replace($$("span:contains('English:')").text(), "").replace(/\s+/g, " ").trim() : null,
                            synonyms: $$("span:contains('Synonyms:')").length > 0 ? $$("span:contains('Synonyms:')").parent().text().replace($$("span:contains('Synonyms:')").text(), "").replace(/\s+/g, " ").trim().split(", ") : [],
                            japanese: $$("span:contains('Japanese:')").length > 0 ? $$("span:contains('Japanese:')").parent().text().replace($$("span:contains('Japanese:')").text(), "").replace(/\s+/g, " ").trim() : null,
                            alternatives: additionalTitles,
                        };

                        relations.push({
                            id,
                            format: this.formatMapping[format as keyof typeof this.formatMapping] ?? this.formatMapping["default"],
                            relationType: relation,
                            title: {
                                english: title.english,
                                native: title.japanese,
                                romaji: title.main,
                            },
                            type,
                        });

                        resolve();
                    }),
                );
            }
        });

        $("table.entries-table tr").each((i, el) => {
            const relation = $(el).find("td:first-child").text().replace(":", "").trim();
            const links = $(el).find("td:nth-child(2) a");

            links.each((_, link) => {
                if (!$(link).text().trim()) {
                    $(link).remove();
                }
            });

            for (const link of links) {
                promises.push(
                    new Promise(async (resolve) => {
                        const url = $(link).attr("href");

                        const data = await (
                            await this.request(url ?? "", {
                                proxy: proxyURL,
                            })
                        ).text();
                        const $$ = load(data);

                        const id = $$("meta[property='og:url']").attr("content")?.split("/")[4] ?? "";
                        const type = $$("meta[property='og:url']").attr("content")?.split("/")[3] === "manga" ? MediaType.MANGA : MediaType.ANIME;
                        const format = $$("span:contains('Type:')").length > 0 ? $$("span:contains('Type:')").parents().first().text().replace($$("span:contains('Type:')").first().text(), "").trim().replace(/\s+/g, " ").trim() : null;
                        const alternativeTitlesDiv = $$("h2:contains('Alternative Titles')").nextUntil("h2:contains('Information')").first();
                        const additionalTitles = alternativeTitlesDiv
                            .find("div.spaceit_pad")
                            .map((_, item) => {
                                return $$(item).text().trim();
                            })
                            .get();

                        const title = {
                            main: $$("meta[property='og:title']").attr("content") || "",
                            english: $$("span:contains('English:')").length > 0 ? $$("span:contains('English:')").parent().text().replace($$("span:contains('English:')").text(), "").replace(/\s+/g, " ").trim() : null,
                            synonyms: $$("span:contains('Synonyms:')").length > 0 ? $$("span:contains('Synonyms:')").parent().text().replace($$("span:contains('Synonyms:')").text(), "").replace(/\s+/g, " ").trim().split(", ") : [],
                            japanese: $$("span:contains('Japanese:')").length > 0 ? $$("span:contains('Japanese:')").parent().text().replace($$("span:contains('Japanese:')").text(), "").replace(/\s+/g, " ").trim() : null,
                            alternatives: additionalTitles,
                        };

                        relations.push({
                            id,
                            format: this.formatMapping[format as keyof typeof this.formatMapping] ?? this.formatMapping["default"],
                            relationType: relation,
                            title: {
                                english: title.english,
                                native: title.japanese,
                                romaji: title.main,
                            },
                            type,
                        });

                        resolve();
                    }),
                );
            }
        });

        await Promise.all(promises);

        /*
        // Unused data
        const approved = $("#addtolist span").filter((_, el) => $(el).text().toLowerCase().includes("pending approval")).length === 0;
        const broadcasted = $("span:contains('Broadcast:')").length > 0 ? ($("span:contains('Broadcast:')").parents().first().text().replace($("span:contains('Broadcast:')").first().text(), "")).replace(/\s+/g, " ").trim() : null;
        const producers = $("span:contains('Producers:')").length > 0 && !$("span:contains('Producers:')").parents().first().text().includes("None found") ? $("span:contains('Producers:')").parents().first().find("a").map((_, el) => { return $(el).text().trim(); }).get() : [];
        const licensors = $("span:contains('Licensors:')").length > 0 && !$("span:contains('Licensors:')").parents().first().text().includes("None found") ? $("span:contains('Licensors:')").parents().first().find("a").map((_, el) => { return $(el).text().trim(); }).get() : [];
        const studios = $("span:contains('Studios:')").length > 0 && $("span:contains('Studios:')").parents().first().text().indexOf("None found") === -1 ? $("span:contains('Studios:')").parents().first().find('a').map((_, el) => $(el).text().trim()).get() : [];
        const source = $("span:contains('Source:')").length > 0 ? $("span:contains('Source:')").parents().first().text().replace($("span:contains('Source:')").first().text(), "").trim() : null;
        const demographics = $("span:contains('Demographic:')").length > 0 ? $("span:contains('Demographic:')").parents().first().find("a").map((_, el) => $(el).text().trim()).get() : $("span:contains('Demographics:')").length > 0 ? $("span:contains('Demographics:')").parents().first().find("a").map((_, el) => $(el).text().trim()).get() : [];
        const themes = $("span:contains('Theme:')").length > 0 ? $("span:contains('Theme:')").parents().first().find("a").map((_, el) => $(el).text().trim()).get() : $("span:contains('Themes:')").length > 0 ? $("span:contains('Themes:')").parents().first().find("a").map((_, el) => $(el).text().trim()).get() : [];
        const rating = $("span:contains('Rating:')").length > 0 ? (() => {
                const cleanedRating = $("span:contains('Rating:')").parents().first().text().replace($("span:contains('Rating:')").text(), "").trim();
                return cleanedRating === "None" ? null : cleanedRating;
            })()
            : null;
        const scoredBy = $("span[itemprop='ratingCount']").length > 0 ? (() => {
                const cleanedScoredBy = $("span[itemprop='ratingCount']").text().trim();
                const numericValue = cleanedScoredBy.replace(/[, ]+(user|users)/g, "");
                return isNaN(Number(numericValue)) ? null : parseInt(numericValue, 10);
            })()
            : null;
        const rank = $("span:contains('Ranked:')").length > 0 ? (() => {
                const rankedText = $("span:contains('Ranked:')")
                    .parents()
                    .first()
                    .text()
                    .replace($("span:contains('Ranked:')").text(), "")
                    .trim();
                const cleanedRanked = rankedText.replace("#", "");
                return cleanedRanked === "N/A" ? null : parseInt(cleanedRanked, 10);
            })()
            : null;
        const members = $("span:contains('Members:')").length > 0 ? parseInt($("span:contains('Members:')").parents().first().text().replace($("span:contains('Members:')").first().text(), "").replace(/,/g, "").trim()) : null;
        const favorites = $("span:contains('Favorites:')").length > 0 ? parseInt($("span:contains('Favorites:')").parents().first().text().replace($("span:contains('Favorites:')").first().text(), "").replace(/,/g, "").trim()) : null;

        const background = $("p[itemprop='description']").length > 0 ? $("p[itemprop='description']").parents().first().text().replace(/\s+/g, " ").trim().replace(/No background information has been added to this title/, "") || null : null;
        const openingThemes = $("div.theme-songs.js-theme-songs.opnening table tr").length > 0 ? $("div.theme-songs.js-theme-songs.opnening table tr").map((i, el) => $(el).text().replace(/\s+/g, " ").trim()).get() : [];
        const endingThemes = $("div.theme-songs.js-theme-songs.ending table tr").length > 0 ? $("div.theme-songs.js-theme-songs.ending table tr").map((i, el) => $(el).text().replace(/\s+/g, " ").trim()).get() : [];
        const aired = $("span:contains('Aired')").length > 0 ? $("span:contains('Aired')").parent().html()?.split('\n').map(line => line.trim())[1] || null : null;
        */

        return {
            id,
            title: {
                english: title.english,
                native: title.japanese,
                romaji: title.main,
            },
            synonyms: title.synonyms.concat(title.alternatives),
            description: synopsis,
            type: MediaType.MANGA,
            rating: score ? score : null,
            popularity: popularity ? parseInt(popularity, 10) : null,
            format: this.formatMapping[format as keyof typeof this.formatMapping] ?? this.formatMapping["default"],
            totalVolumes: volumes ? volumes : null,
            totalChapters: chapters ? chapters : null,
            status: status === "Finished Airing" ? MediaStatus.FINISHED : status === "Currently Airing" ? MediaStatus.RELEASING : MediaStatus.NOT_YET_RELEASED,
            coverImage: imageURL,
            genres: genres.concat(explicitGenres),
            relations,
            year: published ? new Date(published.split(" to")[0]).getFullYear() : null,
            artwork: [],
            bannerImage: "",
            characters: [],
            color: "",
            countryOfOrigin: "",
            author: null,
            publisher: null,
            tags: themes,
        };
    }

    override async proxyCheck(proxyURL: string): Promise<boolean | undefined> {
        try {
            const media = {
                artwork: [],
                averagePopularity: null,
                averageRating: null,
                bannerImage: null,
                characters: [],
                color: null,
                coverImage: null,
                countryOfOrigin: null,
                createdAt: new Date(Date.now()),
                description: null,
                currentEpisode: 0,
                duration: null,
                episodes: {
                    data: [],
                    latest: {
                        latestEpisode: 0,
                        latestTitle: "",
                        updatedAt: 0,
                    },
                },
                format: MediaFormat.TV,
                genres: [],
                id: "108465",
                mappings: [
                    {
                        id: "39535",
                        providerId: "mal",
                        providerType: ProviderType.META,
                        similarity: 1,
                    },
                ],
                popularity: null,
                rating: null,
                relations: [],
                season: MediaSeason.UNKNOWN,
                slug: "mushoku-tensei-isekai-ittara-honki-dasu",
                status: null,
                synonyms: [],
                tags: [],
                title: {
                    english: "Mushoku Tensei: Jobless Reincarnation",
                    native: "無職転生 ～異世界行ったら本気だす～",
                    romaji: "Mushoku Tensei: Isekai Ittara Honki Dasu",
                },
                totalEpisodes: 0,
                trailer: null,
                type: MediaType.ANIME,
                year: 2021,
            };

            const malId = media.mappings.find((data) => {
                return data.providerId === "mal";
            })?.id;

            if (!malId) return undefined;

            // Actually test the proxy by attempting to fetch data
            const response = await this.request(`${this.url}/anime/${malId}`, {
                proxy: proxyURL,
                isChecking: true,
            });

            const data = await response.text();

            const isValid = data.includes("https://cdn.myanimelist.net");

            return isValid;
        } catch {
            return false;
        }
    }
}
