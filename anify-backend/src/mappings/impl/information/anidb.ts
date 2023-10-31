import { load } from "cheerio";
import InformationProvider from ".";
import { Format, MediaStatus, Season } from "../../../types/enums";
import { Anime, AnimeInfo, Chapter, Character, Episode, Manga, MangaInfo, MediaInfoKeys } from "../../../types/types";

export default class AniDB extends InformationProvider<Anime | Manga, AnimeInfo | MangaInfo> {
    override id = "anidb";
    override url = "https://anidb.net";

    public needsProxy: boolean = true;

    override get priorityArea(): MediaInfoKeys[] {
        return [];
    }

    override get sharedArea(): MediaInfoKeys[] {
        return ["synonyms", "genres", "tags"];
    }

    override async info(media: Anime | Manga): Promise<AnimeInfo | MangaInfo | undefined> {
        const aniDbId = media.mappings.find((data) => {
            return data.providerId === "anidb";
        })?.id;

        if (!aniDbId) return undefined;

        const data = await (await this.request(`${this.url}${aniDbId}`)).text();

        const $ = load(data);

        const characters: Character[] = [];

        $("div#characterlist div.character div.column div.g_bubble").map((_, el) => {
            characters.push({
                image: $(el).find("div.thumb img").attr("src") ?? "",
                name: $(el).find("div.data div.name a.name-colored span").text()?.trim(),
                voiceActor: {
                    image: "",
                    name: $("div.info div.seiyuu span.name a.primary span").first().text()?.trim(),
                },
            });
        });

        $("div#characterlist div.cast div.column div.g_bubble").map((_, el) => {
            characters.push({
                image: $(el).find("div.thumb img").attr("src") ?? "",
                name: $(el).find("div.data div.name a.name-colored span").text()?.trim(),
                voiceActor: {
                    image: "",
                    name: $("div.info div.seiyuu span.name a.primary span").first().text()?.trim(),
                },
            });
        });

        return {
            id: aniDbId,
            type: media.type,
            year: new Date($("div.info tr.year td.value span").first()?.text().trim()).getFullYear(),
            trailer: null,
            status: new Date($("div.info tr.year td.value span").last()?.text().trim()) > new Date() ? MediaStatus.RELEASING : MediaStatus.FINISHED,
            totalEpisodes: Number($("div.info tr.type td.value span").html()),
            totalChapters: null,
            totalVolumes: null,
            title: {
                english: $("div.info div.titles tr.official").first()?.find("td.value label").text(),
                romaji: $("div.info div.titles tr.romaji td.value span").text(),
                native: $("div.info div.titles tr.official").last()?.find("td.value label").text(),
            },
            synonyms:
                $("div.info div.titles tr.syn td.value")
                    .text()
                    ?.split(", ")
                    .map((data) => data.trim())
                    .concat($("div.titles tr.short td.value").text()) ?? [],
            tags: [],
            coverImage: $("div.info div.image div.container img").attr("src") ?? null,
            bannerImage: null,
            characters,
            season: $("div.info tr.season td.value a").text()?.split(" ")[0].toUpperCase().replace(/"/g, "") as Season,
            countryOfOrigin: null,
            relations: [],
            rating: Number($("div.info tr.rating td.value a span.value").text() ?? 0),
            popularity: Number($("div.info tr.rating td.value span.count").attr("content") ?? 0),
            artwork: [],
            color: null,
            currentEpisode: null,
            description: $("div.desc").text()?.trim(),
            duration: null,
            format: Format.UNKNOWN,
            genres: [],
        } as AnimeInfo;
    }

    override async fetchContentData(media: Anime | Manga): Promise<Episode[] | Chapter[] | undefined> {
        const aniDbId = media.mappings.find((data) => {
            return data.providerId === "anidb";
        })?.id;

        if (!aniDbId) return undefined;

        const data = await (await this.request(`${this.url}${aniDbId}`)).text();

        const $ = load(data);

        const episodeList: {
            id: string;
            title: string;
            number: number;
            duration: string;
            airDate: number;
        }[] = [];

        $("div.episodes table#eplist tr").map((i, el) => {
            if ($(el).find("td.id a abbr").attr("title") === "Regular Episode") {
                episodeList.push({
                    id: $(el).find("td.id a").attr("href") ?? "",
                    number: Number($(el).find("td.id").text()),
                    title: $(el).find("td.episode label").text()?.trim() ?? "", // The title attribute contains synonyms
                    duration: $(el).find("td.duration").text(),
                    airDate: new Date($(el).find("td.date").attr("content") ?? "").getTime(),
                });
            }
        });

        const episodePromises = episodeList.map((episode) => this.fetchEpisodeData(episode));

        const episodes = await Promise.all(episodePromises);

        return episodes.filter((episode) => episode !== undefined) as Episode[];
    }

    private async fetchEpisodeData(episode: { id: string; title: string; number: number; duration: string; airDate: number }): Promise<Episode | undefined> {
        try {
            const response = await (await this.request(`${this.url}${episode.id}`)).text();
            const $ = load(response);

            const description = $("div.desc div.summary").text()?.trim() || null;
            const rating = Number($("div.info tr.rating td.value a span.value").text());

            return {
                id: episode.id,
                description,
                hasDub: false,
                img: null,
                isFiller: false,
                number: episode.number,
                rating,
                title: episode.title,
                updatedAt: isNaN(new Date($("div.info tr.date td.value span").text()?.trim() || "").getTime()) ? undefined : new Date($("div.info tr.date td.value span").text()?.trim() || "").getTime(),
            };
        } catch (error) {
            return undefined;
        }
    }
}
