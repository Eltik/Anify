import { load } from "cheerio";
import InformationProvider from ".";
import { Format, Genres, MediaStatus, Season, Type } from "../../../types/enums";
import { Anime, AnimeInfo, Manga, MangaInfo, MediaInfoKeys } from "../../../types/types";

export default class NovelUpdatesInfo extends InformationProvider<Anime | Manga, AnimeInfo | MangaInfo> {
    override id = "novelupdates";
    override url = "https://www.novelupdates.com";

    override get priorityArea(): MediaInfoKeys[] {
        return [];
    }

    override get sharedArea(): MediaInfoKeys[] {
        return ["synonyms", "genres", "tags"];
    }

    override async info(media: Anime | Manga): Promise<AnimeInfo | MangaInfo | undefined> {
        const novelUpdatesId = media.mappings.find((data) => {
            return data.providerId === "novelupdates";
        })?.id;

        if (!novelUpdatesId) return undefined;

        const data = await (await this.request(`${this.url}/series/${novelUpdatesId}`, { headers: { Cookie: "_ga=;" } }, true)).text();
        const $$ = load(data);

        const synonyms = $$("div#editassociated").html()?.split("<br>") ?? [];
        const year = Number($$("div#edityear").text()?.trim() ?? 0);

        return {
            id: novelUpdatesId ?? "",
            artwork: [],
            bannerImage: null,
            characters: [],
            color: null,
            countryOfOrigin: $$("div#showlang a").text()?.trim() ?? null,
            coverImage: $$("div.seriesimg img").attr("src") ?? null,
            currentEpisode: null,
            description: $$("div#editdescription").text()?.trim() ?? null,
            duration: null,
            format: Format.NOVEL,
            genres: $$("div#seriesgenre a")
                .map((_, el) => $$(el).text())
                .get() as Genres[],
            popularity: Number($$("b.rlist").text()?.trim() ?? 0) * 2,
            rating: Number($$("h5.seriesother span.uvotes").text()?.split(" /")[0]?.substring(1) ?? 0) * 2,
            relations: [],
            season: Season.UNKNOWN,
            status: $$("div#editstatus").text()?.includes("Complete") ? MediaStatus.FINISHED : MediaStatus.RELEASING,
            synonyms,
            tags: $$("div#showtags a")
                .map((_, el) => $$(el).text())
                .get(),
            title: {
                english: $$("div.seriestitlenu").text()?.trim() ?? null,
                native: $$("div#editassociated").html()?.split("<br>")[($$("div#editassociated").html()?.split("<br>") ?? []).length - 1]?.trim() ?? null,
                romaji: $$("div#editassociated").html()?.split("<br>")[0]?.trim() ?? null,
            },
            totalChapters: isNaN(Number($$("div#editstatus").text()?.split(" / ")[1]?.split(" Chapters")[0]?.trim())) ? null : Number($$("div#editstatus").text()?.split(" / ")[1]?.split(" Chapters")[0]?.trim()),
            totalVolumes: isNaN(Number($$("div#editstatus").text()?.split(" / ")[0].split(" Volumes")[0]?.trim())) ? null : Number($$("div#editstatus").text()?.split(" / ")[0].split(" Volumes")[0]?.trim()),
            trailer: null,
            type: Type.MANGA,
            year,
            publisher: $$("div#showopublisher a").text(),
            author: $$("div#showauthors a").text()
        };
    }
}

type JikanResponse = {
    mal_id: number;
    url: string;
    title: string;
    title_english: string | null;
    title_japanese: string | null;
    title_synonyms: string[];
    type: string;
    status: string;
    synopsis: string | null;
    images: {
        jpg: {
            image_url: string | null;
            small_image_url: string | null;
            large_image_url: string | null;
        };
        webp: {
            image_url: string | null;
            small_image_url: string | null;
            large_image_url: string | null;
        };
    };
    duration: string;
    episodes: number | null;
    popularity: number | null;
    score: number | null;
    season: string;
    year: number | null;
    genres: { name: string }[];
    trailer: {
        youtube_id: string | null;
        url: string | null;
        embed_url: string | null;
        images: {
            image_url: string | null;
            small_image_url: string | null;
            medium_image_url: string | null;
            large_image_url: string | null;
            maximum_image_url: string | null;
        };
    };
    approved: boolean;
    titles: {
        type: string;
        title: string;
    }[];
};
