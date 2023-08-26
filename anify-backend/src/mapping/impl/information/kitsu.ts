import InformationProvider, { AnimeInfo, MangaInfo, MediaInfoKeys } from ".";
import { Anime, Artwork, Format, Manga, Season } from "../..";
export default class Kitsu extends InformationProvider<Anime | Manga, AnimeInfo | MangaInfo> {
    override id = "kitsu";
    override url = "https://kitsu.io";

    private kitsuApiUrl = "https://kitsu.io/api/edge";

    override get priorityArea(): MediaInfoKeys[] {
        return ["coverImage"];
    }

    override get sharedArea(): MediaInfoKeys[] {
        return ["synonyms", "genres", "artwork"];
    }

    override async info(media: Anime | Manga): Promise<AnimeInfo | MangaInfo | undefined> {
        const kitsuId = media.mappings.find((data) => {
            return data.providerId === "kitsu";
        })?.id;

        if (!kitsuId) return undefined;

        const kitsuResponse: KitsuResponse = await (await this.request(`${this.kitsuApiUrl}/${media.type.toLowerCase()}/${kitsuId}`)).json();

        const attributes = kitsuResponse?.data?.attributes;

        if (!attributes) return undefined;

        const kitsuGenre = await (await this.request(`${this.kitsuApiUrl}/${media.type.toLowerCase()}/${kitsuId}/genres`)).json();
        const genres = kitsuGenre?.data;

        const artwork: Artwork[] = [];

        if (attributes.coverImage?.original)
            artwork.push({
                type: "banner",
                img: attributes.coverImage.original,
                providerId: this.id,
            });
        if (attributes.posterImage?.original)
            artwork.push({
                type: "poster",
                img: attributes.posterImage.original,
                providerId: this.id,
            });

        return {
            title: {
                english: attributes.titles.en ?? null,
                romaji: attributes.titles.en_jp ?? null,
                native: attributes.titles.ja_jp ?? null,
            },
            currentEpisode: null,
            trailer: null,
            duration: attributes.episodeLength ?? null,
            color: null,
            bannerImage: attributes.coverImage?.original ?? null,
            coverImage: attributes.posterImage?.original ?? null,
            status: null,
            format: Format.UNKNOWN,
            season: Season.UNKNOWN,
            synonyms: [],
            description: attributes.synopsis ?? null,
            year: null,
            totalEpisodes: attributes.episodeCount ?? 0,
            genres: genres ? genres.map((genre) => genre.attributes.name) : [],
            rating: attributes.averageRating ? Number.parseFloat((Number.parseFloat(attributes.averageRating) / 10).toFixed(2)) : null,
            popularity: null,
            countryOfOrigin: null,
            tags: [],
            relations: [],
            artwork,
            characters: [],
        };
    }

    public async getEpisodeCovers(id: string): Promise<{ episode: number; img: string }[]> {
        const episodeCovers: { episode: number; img: string }[] = [];

        let hasNext = true;
        let page = 0;
        const maxRetries = 3;
        let retries = 0;

        while (hasNext && retries < maxRetries) {
            const url = this.kitsuApiUrl + `/anime/${id}/episodes?page[limit]=20&page[offset]=${page * 20}`;

            const headers = {
                Accept: "application/vnd.api+json",
                "Content-Type": "application/vnd.api+json",
            };

            let req;
            try {
                req = await this.request(url, { headers });
            } catch (err) {
                console.error(`Error fetching ${url}`, err);
                retries++;
                await new Promise((resolve) => setTimeout(resolve, 1000)); // wait 1 second before retrying
                continue;
            }

            if (!req) {
                retries++;
                await new Promise((resolve) => setTimeout(resolve, 1000)); // wait 1 second before retrying
                continue;
            }

            const data = await req.json().catch(undefined);
            if (!data) {
                retries++;
                await new Promise((resolve) => setTimeout(resolve, 1000)); // wait 1 second before retrying
                continue;
            }

            for (let i = 0; i < data.data.length; i++) {
                const episode = data.data[i];
                episodeCovers.push({
                    episode: episode.attributes.relativeNumber,
                    img: episode.attributes.thumbnail?.original,
                });
            }

            if (data.links.next) {
                page++;
            } else {
                hasNext = false;
            }
        }

        return episodeCovers;
    }
}

type KitsuResponse = {
    data: {
        attributes: {
            titles: {
                en: string | null;
                en_jp: string | null;
                ja_jp: string | null;
            };
            description: string | null;
            subtype: string;
            status: string;
            showType: string;
            synopsis: string | null;
            episodeLength: number | null;
            posterImage: {
                original: string | null;
            };
            coverImage: {
                original: string | null;
            };
            averageRating: string | null;
            episodeCount: number | null;
        };
    };
};
