import MetaProvider from ".";
import { Format } from "../../../types/enums";
import { Result } from "../../../types/types";

export default class MALMeta extends MetaProvider {
    override id = "mal";
    override url = "https://myanimelist.net";

    private api = "https://api.jikan.moe/v4";

    override rateLimit = 500;
    override formats: Format[] = [Format.TV, Format.MOVIE, Format.ONA, Format.SPECIAL, Format.TV_SHORT, Format.OVA, Format.MANGA, Format.ONE_SHOT, Format.NOVEL];

    override async search(query: string, format?: Format | undefined, year?: number | undefined): Promise<Result[] | undefined> {
        const results: Result[] = [];

        try {
            const anime = await (await this.request(`${this.api}/anime?q=${encodeURIComponent(query)}&sfw`, {}, true)).json();
            const manga = await (await this.request(`${this.api}/manga?q=${encodeURIComponent(query)}&sfw`, {}, true)).json();

            for (const data of anime.data) {
                results.push({
                    id: String(data.mal_id),
                    altTitles: data.title_synonyms?.filter((s: string) => s?.length) ?? [],
                    format: data.type?.toLowerCase() === "tv" ? Format.TV : data.type?.toLowerCase() === "movie" ? Format.MOVIE : data.type?.toLowerCase() === "ova" ? Format.OVA : data.type?.toLowerCase() === "special" ? Format.SPECIAL : data.type?.toLowerCase() === "ona" ? Format.ONA : data.type?.toLowerCase() === "music" ? Format.MUSIC : data.type?.toLowerCase() === "manga" ? Format.MANGA : data.type?.toLowerCase() === "novel" ? Format.NOVEL : data.type?.toLowerCase() === "lightnovel" ? Format.NOVEL : data.type?.toLowerCase() === "oneshot" ? Format.ONE_SHOT : data.type?.toLowerCase() === "doujin" ? Format.MANGA : data.type?.toLowerCase() === "manhwa" ? Format.MANGA : data.type?.toLowerCase() === "manhua" ? Format.MANGA : Format.UNKNOWN,
                    img: data.images?.jpg?.large_image_url ?? data.images?.jpg?.image_url ?? data.images?.jpg?.small_image_url ?? null,
                    providerId: this.id,
                    title: data.title ?? data.title_english ?? data.title_japanese ?? "",
                    year: data.year ? data.year : data.published ? (data.published.from ? new Date(data.published).getFullYear() : data.published.prop ? data.published.prop.from?.year : null) : null,
                });
            }

            for (const data of manga.data) {
                results.push({
                    id: String(data.mal_id),
                    altTitles: data.title_synonyms?.filter((s: string) => s?.length) ?? [],
                    format: data.type?.toLowerCase() === "tv" ? Format.TV : data.type?.toLowerCase() === "movie" ? Format.MOVIE : data.type?.toLowerCase() === "ova" ? Format.OVA : data.type?.toLowerCase() === "special" ? Format.SPECIAL : data.type?.toLowerCase() === "ona" ? Format.ONA : data.type?.toLowerCase() === "music" ? Format.MUSIC : data.type?.toLowerCase() === "manga" ? Format.MANGA : data.type?.toLowerCase() === "novel" ? Format.NOVEL : data.type?.toLowerCase() === "lightnovel" ? Format.NOVEL : data.type?.toLowerCase() === "oneshot" ? Format.ONE_SHOT : data.type?.toLowerCase() === "doujin" ? Format.MANGA : data.type?.toLowerCase() === "manhwa" ? Format.MANGA : data.type?.toLowerCase() === "manhua" ? Format.MANGA : Format.UNKNOWN,
                    img: data.images?.jpg?.large_image_url ?? data.images?.jpg?.image_url ?? data.images?.jpg?.small_image_url ?? null,
                    providerId: this.id,
                    title: data.title ?? data.title_english ?? data.title_japanese ?? "",
                    year: data.year ? data.year : data.published ? (data.published.from ? new Date(data.published).getFullYear() : data.published.prop ? data.published.prop.from?.year : null) : null,
                });
            }

            return results;
        } catch (e) {
            return undefined;
        }
    }
}
