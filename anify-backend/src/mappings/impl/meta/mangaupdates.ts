import { load } from "cheerio";
import MetaProvider from ".";
import { Format, Type } from "../../../types/enums";
import { Result } from "../../../types/types";

export default class MangaUpdatesMeta extends MetaProvider {
    override id = "mangaupdates";
    override url = "https://mangaupdates.com";

    public needsProxy: boolean = true;

    override rateLimit = 500;
    override formats: Format[] = [Format.TV, Format.MOVIE, Format.ONA, Format.SPECIAL, Format.TV_SHORT, Format.OVA];

    override async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        const results: Result[] = [];

        return results;
    }
}
