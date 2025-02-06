import MetaProvider from "..";
import { IProviderResult, MediaFormat } from "../../../../types";

export default class TVDBMeta extends MetaProvider {
    override id = "tvdb";
    override url = "https://thetvdb.com";

    private api = "https://api4.thetvdb.com/v4";
    private apiKeys = ["f5744a13-9203-4d02-b951-fbd7352c1657", "8f406bec-6ddb-45e7-8f4b-e1861e10f1bb", "5476e702-85aa-45fd-a8da-e74df3840baf", "51020266-18f7-4382-81fc-75a4014fa59f"];

    public needsProxy: boolean = true;
    public useGoogleTranslate: boolean = false;

    override rateLimit = 0;
    override maxConcurrentRequests: number = -1;

    override formats: MediaFormat[] = [MediaFormat.TV, MediaFormat.MOVIE, MediaFormat.ONA, MediaFormat.SPECIAL, MediaFormat.TV_SHORT, MediaFormat.OVA];

    override async search(query: string, format?: MediaFormat, year?: number): Promise<IProviderResult[] | undefined> {
        const results: IProviderResult[] = [];

        const isSeason = query.toLowerCase().includes("season");

        if (isSeason) {
            query = query.toLowerCase().replace("season", "");
        }

        const token = await this.getToken(this.apiKeys[Math.floor(Math.random() * this.apiKeys.length)]);

        const formattedType = format === MediaFormat.TV || format === MediaFormat.TV_SHORT || format === MediaFormat.SPECIAL ? "series" : format === MediaFormat.MOVIE ? "movie" : undefined;

        const data = await this.request(`${this.api}/search?query=${encodeURIComponent(query)}${year && !isSeason ? `&year=${year}` : ""}${formattedType ? `&type=${formattedType}` : ""}`, {
            headers: {
                Authorization: `Bearer ${token}`,
            },
        });

        if (data?.ok) {
            const searchData = ((await data.json()) as { data: ISearchResponse[] }).data;
            for (const data of searchData) {
                if (data.primary_type != TVDBType.SERIES && data.primary_type != TVDBType.MOVIE) continue;
                if (isSeason) data.year = "0";

                results.push({
                    id: `/${data.primary_type}/${data.tvdb_id}`,
                    format: MediaFormat.UNKNOWN,
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

    private async getToken(key: string, proxyURL?: string): Promise<string | undefined> {
        const data: Response | undefined = await this.request(`${this.api}/login`, {
            proxy: proxyURL,
            body: JSON.stringify({
                apikey: `${key}`,
            }),
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
        }).catch(() => {
            return undefined;
        });
        if (!data) return undefined;

        if (data.ok) {
            return ((await data.json()) as { data: { token: string } }).data.token as string;
        }

        return undefined;
    }

    override async proxyCheck(proxyURL: string): Promise<boolean | undefined> {
        try {
            let query = "Mushoku Tensei";
            const format = MediaFormat.TV;

            const results: IProviderResult[] = [];

            const isSeason = query.toLowerCase().includes("season");

            if (isSeason) {
                query = query.toLowerCase().replace("season", "");
            }

            const token = await this.getToken(this.apiKeys[Math.floor(Math.random() * this.apiKeys.length)], proxyURL);

            const formattedType = format === MediaFormat.TV || format === MediaFormat.TV_SHORT || format === MediaFormat.SPECIAL ? "series" : format === MediaFormat.MOVIE ? "movie" : undefined;

            const data = await this.request(`${this.api}/search?query=${encodeURIComponent(query)}${formattedType ? `&type=${formattedType}` : ""}`, {
                proxy: proxyURL,
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            if (data?.ok) {
                const searchData = ((await data.json()) as { data: ISearchResponse[] }).data;
                for (const data of searchData) {
                    if (data.primary_type != TVDBType.SERIES && data.primary_type != TVDBType.MOVIE) continue;
                    if (isSeason) data.year = "0";

                    results.push({
                        id: `/${data.primary_type}/${data.tvdb_id}`,
                        format: MediaFormat.UNKNOWN,
                        title: data.name,
                        altTitles: data.aliases ?? [],
                        img: data.image_url,
                        year: Number(data.year ?? 0) ?? 0,
                        providerId: this.id,
                    });
                }
            }

            return results.length > 0;
        } catch {
            return false;
        }
    }
}

/* Search Types */
interface ISearchResponse {
    objectID: string;
    country?: TVDBCountry;
    director?: string;
    extended_title?: string;
    genres?: TVDBGenre[];
    id: string;
    image_url: string;
    name: string;
    overview?: string;
    primary_language?: TVDBPrimaryLanguage;
    primary_type: TVDBType;
    status?: TVDBStatus;
    type: TVDBType;
    tvdb_id: string;
    year?: string;
    slug?: string;
    overviews?: ITVDBOverviews;
    translations: ITVDBOverviews;
    remote_ids?: ITVDBRemoteID[];
    thumbnail?: string;
    aliases?: string[];
    first_air_time?: Date;
    network?: string;
    studios?: string[];
}

enum TVDBCountry {
    CZE = "cze",
    JPN = "jpn",
    USA = "usa",
}

enum TVDBGenre {
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

interface ITVDBOverviews {
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

enum TVDBPrimaryLanguage {
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

interface ITVDBRemoteID {
    id: string;
    type: number;
    sourceName: TVDBSourceName;
}

enum TVDBSourceName {
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

enum TVDBStatus {
    CONTINUING = "Continuing",
    ENDED = "Ended",
    RELEASED = "Released",
    UPCOMING = "Upcoming",
}
