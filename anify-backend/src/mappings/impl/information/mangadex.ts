import InformationProvider from ".";
import { Format, Formats, MediaStatus, Season } from "../../../types/enums";
import { Anime, AnimeInfo, Manga, MangaInfo, MediaInfoKeys } from "../../../types/types";

export default class MangaDexInfo extends InformationProvider<Anime | Manga, AnimeInfo | MangaInfo> {
    override id = "mangadex";
    override url = "https://mangadex.org";

    private api = "https://api.mangadex.org";

    public needsProxy: boolean = true;

    override get priorityArea(): MediaInfoKeys[] {
        return [];
    }

    override get sharedArea(): MediaInfoKeys[] {
        return ["synonyms", "genres", "artwork", "tags"];
    }

    override async info(media: Anime | Manga): Promise<AnimeInfo | MangaInfo | undefined> {
        const mangadexId = media.mappings.find((data) => {
            return data.providerId === "mangadex";
        })?.id;

        if (!mangadexId) return undefined;

        try {
            const data = ((await (await this.request(`${this.api}/manga/${mangadexId}`)).json()) as { data: any }).data;
            const covers = (await (await this.request(`${this.api}/cover?limit=100&manga[]=${mangadexId}`)).json()) as { data: any[] };

            const formatString: string = data.type.toUpperCase();
            const format: Format = formatString === "ADAPTATION" ? Format.MANGA : Formats.includes(formatString as Format) ? (formatString as Format) : Format.MANGA;

            return {
                id: mangadexId,
                type: media.type,
                title: {
                    english: data.attributes.title[Object.keys(data.attributes.title).filter((value) => value === "en")[0]] ?? data.attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "en")?.en ?? null,
                    romaji:
                        data.attributes.title["ja-ro"] ??
                        data.attributes.title["jp-ro"] ??
                        data.attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "ja-ro")?.["ja-ro"] ??
                        data.attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "jp-ro")?.["jp-ro"] ??
                        null,
                    native:
                        data.attributes.title["jp"] ??
                        data.attributes.title["ja"] ??
                        data.attributes.title["ko"] ??
                        data.attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "jp")?.jp ??
                        data.attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "ja")?.ja ??
                        data.attributes.altTitles.find((title: { [key: string]: string }) => Object.keys(title)[0] === "ko")?.ko ??
                        null,
                },
                synonyms: data.attributes.altTitles.map((title: { [key: string]: string }) => {
                    return Object.values(title)[0];
                }),
                description: data.attributes.description.en ?? data.attributes.description.jp ?? data.attributes.description.jp_ro ?? data.attributes.description.ko ?? Object.values(data.attributes.description)[0],
                countryOfOrigin: data.attributes.publicationDemographic ?? data.attributes.originalLanguage?.toUpperCase() ?? null,
                characters: [],
                genres: data.attributes.tags.filter((tag: any) => tag.attributes.group === "genre").map((tag: any) => tag.attributes.name.en),
                year: data.attributes.year,
                artwork: covers.data.map((cover: any) => {
                    const img = `${this.url}/covers/${mangadexId}/${cover.attributes.fileName}`;
                    const providerId = this.id;
                    const type = "poster";
                    return {
                        img,
                        providerId,
                        type,
                    };
                }),
                totalChapters: data.attributes.lastChapter ?? null,
                totalVolumes: data.attributes.lastVolume ?? null,
                status: data.attributes.status === "ongoing" ? MediaStatus.RELEASING : data.attributes.status === "completed" ? MediaStatus.FINISHED : null,
                color: null,
                currentEpisode: null,
                duration: null,
                popularity: null,
                relations: [],
                tags: data.attributes.tags.filter((tag: any) => tag.attributes.group === "theme").map((tag: any) => tag.attributes.name.en),
                rating: null,
                season: Season.UNKNOWN,
                trailer: null,
                format,
                coverImage: `${this.url}/covers/${mangadexId}/${data.relationships.find((element: any) => element.type === "cover_art").id}.jpg`,
                bannerImage: null,
                author: data.relationships.find((element: any) => element.type === "author")?.attributes.name ?? null,
                publisher: data.relationships.find((element: any) => element.type === "publisher")?.attributes.name ?? null,
            } as MangaInfo;
        } catch (e) {
            return undefined;
        }
    }
}
