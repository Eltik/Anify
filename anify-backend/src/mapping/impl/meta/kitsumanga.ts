import { Format, Formats, Result, Type } from "../..";
import MetaProvider from ".";

export default class KitsuManga extends MetaProvider {
    override rateLimit = 250;
    override id = "kitsu";
    override url = "https://kitsu.io";
    override formats: Format[] = [Format.MANGA, Format.ONE_SHOT, Format.NOVEL];

    private kitsuApiUrl = "https://kitsu.io/api/edge";

    override async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        const results: Result[] = [];

        const searchUrl = `/manga?filter[text]=${encodeURIComponent(query)}`;
        const req = await this.request(
            this.kitsuApiUrl + searchUrl,
            {
                headers: {
                    Accept: "application/vnd.api+json",
                    "Content-Type": "application/vnd.api+json",
                },
            },
            true
        ).catch((err) => {
            return null;
        });
        if (!req) {
            return results;
        }
        const data = await req.json();
        if (data.data.length > 0) {
            data.data.forEach((result: KitsuResult) => {
                const altTitles = [result.attributes.titles.en_jp, result.attributes.titles.ja_jp, result.attributes.titles.en_us, result.attributes.titles.en, result.attributes.titles.en_kr, result.attributes.titles.ko_kr, result.attributes.titles.en_cn, result.attributes.titles.zh_cn].filter(Boolean);

                const formatString = result.attributes.subtype.toUpperCase();
                const format: Format = Formats.includes(formatString as Format) ? (formatString as Format) : Format.UNKNOWN;

                results.push({
                    title: result.attributes.titles.en_us || result.attributes.titles.en_jp || result.attributes.titles.ja_jp || result.attributes.titles.en || result.attributes.titles.en_kr || result.attributes.titles.ko_kr || result.attributes.titles.en_cn || result.attributes.titles.zh_cn || result.attributes.canonicalTitle || result.attributes.slug,
                    altTitles: altTitles,
                    id: result.id,
                    img: result.attributes.posterImage?.original ?? null,
                    format,
                    year: result.attributes.startDate ? new Date(result.attributes.startDate).getFullYear() : 0,
                    providerId: this.id,
                });
            });
            return results;
        } else {
            return results;
        }
    }
}

type KitsuResult = {
    id: string;
    type: string;
    links: {
        self: string;
    };
    attributes: {
        createdAt: string;
        updatedAt: string;
        slug: string;
        synopsis: string;
        description: string;
        coverImageTopOffset: number;
        titles: {
            en: string;
            en_us: string;
            en_kr: string;
            en_cn: string;
            en_jp: string;
            fr_fr: string;
            ja_jp: string;
            ko_kr: string;
            pt_pt: string;
            ru_ru: string;
            th_th: string;
            zh_cn: string;
        };
        canonicalTitle: string;
        abbreviatedTitles: string[];
        averageRating: string;
        ratingFrequencies: {
            [key: string]: string;
        };
        userCount: number;
        favoritesCount: number;
        startDate: string;
        endDate: string | null;
        nextRelease: string | null;
        popularityRank: number;
        ratingRank: number;
        ageRating: string;
        ageRatingGuide: string | null;
        subtype: string;
        status: string;
        tba: string | null;
        posterImage: {
            tiny: string;
            large: string;
            small: string;
            medium: string;
            original: string;
            meta: {
                dimensions: {
                    tiny: {
                        width: number;
                        height: number;
                    };
                    large: {
                        width: number;
                        height: number;
                    };
                    small: {
                        width: number;
                        height: number;
                    };
                    medium: {
                        width: number;
                        height: number;
                    };
                };
            };
        };
        coverImage: {
            tiny: string;
            large: string;
            small: string;
            original: string;
            meta: {
                dimensions: {
                    tiny: {
                        width: number;
                        height: number;
                    };
                    large: {
                        width: number;
                        height: number;
                    };
                    small: {
                        width: number;
                        height: number;
                    };
                };
            };
        };
        chapterCount: number | null;
        volumeCount: number | null;
        serialization: string;
        mangaType: string;
    };
    relationships: {
        genres: {
            links: {
                self: string;
                related: string;
            };
        };
        categories: {
            links: {
                self: string;
                related: string;
            };
        };
        castings: {
            links: {
                self: string;
                related: string;
            };
        };
        installments: {
            links: {
                self: string;
                related: string;
            };
        };
        mappings: {
            links: {
                self: string;
                related: string;
            };
        };
        reviews: {
            links: {
                self: string;
                related: string;
            };
        };
        mediaRelationships: {
            links: {
                self: string;
                related: string;
            };
        };
        characters: {
            links: {
                self: string;
                related: string;
            };
        };
        staff: {
            links: {
                self: string;
                related: string;
            };
        };
        productions: {
            links: {
                self: string;
                related: string;
            };
        };
        quotes: {
            links: {
                self: string;
                related: string;
            };
        };
        chapters: {
            links: {
                self: string;
                related: string;
            };
        };
        mangaCharacters: {
            links: {
                self: string;
                related: string;
            };
        };
        mangaStaff: {
            links: {
                self: string;
                related: string;
            };
        };
    };
};
