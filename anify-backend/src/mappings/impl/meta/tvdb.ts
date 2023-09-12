import MetaProvider from ".";
import { Format } from "../../../types/enums";
import { Result } from "../../../types/types";

export default class TheTVDB extends MetaProvider {
    override rateLimit = 500;
    override id = "tvdb";
    override url = "https://thetvdb.com";
    override formats: Format[] = [Format.TV, Format.MOVIE, Format.ONA, Format.SPECIAL, Format.TV_SHORT, Format.OVA];

    private tvdbApiUrl = "https://api4.thetvdb.com/v4";

    private apiKeys = ["f5744a13-9203-4d02-b951-fbd7352c1657", "8f406bec-6ddb-45e7-8f4b-e1861e10f1bb", "5476e702-85aa-45fd-a8da-e74df3840baf", "51020266-18f7-4382-81fc-75a4014fa59f"];

    override async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        const results: Result[] = [];

        const isSeason = query.toLowerCase().includes("season");

        if (isSeason) {
            query = query.toLowerCase().replace("season", "");
        }

        const token = await this.getToken(this.apiKeys[Math.floor(Math.random() * this.apiKeys.length)]);

        const formattedType = format === Format.TV || Format.TV_SHORT || Format.SPECIAL ? "series" : format === Format.MOVIE ? "movie" : undefined;

        const data = await this.request(
            `${this.tvdbApiUrl}/search?query=${encodeURIComponent(query)}${year && !isSeason ? `&year=${year}` : ""}${formattedType ? `&type=${formattedType}` : ""}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            },
            false,
        );

        if (data?.ok) {
            const searchData: Search[] = (await data.json()).data;
            for (const data of searchData) {
                if (data.primary_type != TVDBType.SERIES && data.primary_type != TVDBType.MOVIE) continue;
                if (isSeason) data.year = "0";

                results.push({
                    id: `/${data.primary_type}/${data.tvdb_id}`,
                    format: Format.UNKNOWN,
                    title: data.name,
                    altTitles: data.aliases ?? [],
                    img: data.image_url,
                    year: Number(data.year ?? 0) ?? 0,
                    providerId: this.id,
                });
            }
        }

        return results;
    }

    private async getToken(key: string): Promise<string | undefined> {
        const data: Response | undefined = await this.request(
            `${this.tvdbApiUrl}/login`,
            {
                body: JSON.stringify({
                    apikey: `${key}`,
                }),
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            },
            false,
        ).catch((err) => {
            console.error(err);
            return undefined;
        });
        if (!data) return undefined;

        if (data.ok) {
            return (await data.json()).data.token as string;
        }

        return undefined;
    }
}

/* Search Types */
interface Search {
    objectID: string;
    country?: Country;
    director?: string;
    extended_title?: string;
    genres?: Genre[];
    id: string;
    image_url: string;
    name: string;
    overview?: string;
    primary_language?: PrimaryLanguage;
    primary_type: TVDBType;
    status?: Status;
    type: TVDBType;
    tvdb_id: string;
    year?: string;
    slug?: string;
    overviews?: Overviews;
    translations: Overviews;
    remote_ids?: RemoteID[];
    thumbnail?: string;
    aliases?: string[];
    first_air_time?: Date;
    network?: string;
    studios?: string[];
}

enum Country {
    CZE = "cze",
    JPN = "jpn",
    USA = "usa",
}

enum Genre {
    ACTION = "Action",
    ADVENTURE = "Adventure",
    ANIMATION = "Animation",
    ANIME = "Anime",
    CHILDREN = "Children",
    COMEDY = "Comedy",
    DRAMA = "Drama",
    FAMILY = "Family",
    FANTASY = "Fantasy",
    SPORT = "Sport",
}

interface Overviews {
    eng?: string;
    fra?: string;
    ita?: string;
    jpn?: string;
    pol?: string;
    pt?: string;
    spa?: string;
    por?: string;
    ara?: string;
    cat?: string;
    deu?: string;
    heb?: string;
    kor?: string;
    msa?: string;
    rus?: string;
    srp?: string;
    tur?: string;
    zho?: string;
    hun?: string;
    cha?: string;
    nld?: string;
    tha?: string;
    ces?: string;
}

enum PrimaryLanguage {
    CES = "ces",
    ENG = "eng",
    ITA = "ita",
    JPN = "jpn",
}

enum TVDBType {
    LIST = "list",
    MOVIE = "movie",
    SERIES = "series",
}

interface RemoteID {
    id: string;
    type: number;
    sourceName: SourceName;
}

enum SourceName {
    EIDR = "EIDR",
    FACEBOOK = "Facebook",
    FANSITE = "Fan Site",
    IMDB = "IMDB",
    INSTAGRAM = "Instagram",
    OFFICIAL_WEBSITE = "Official Website",
    TMS_ZAP2It = "TMS (Zap2It)",
    TMDB = "TheMovieDB.com",
    TWITTER = "Twitter",
    YOUTUBE = "Youtube",
}

enum Status {
    CONTINUING = "Continuing",
    ENDED = "Ended",
    RELEASED = "Released",
    UPCOMING = "Upcoming",
}
