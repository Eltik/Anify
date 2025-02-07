import MetaProvider from "..";
import { IProviderResult, MediaFormat } from "../../../../types";

export default class KitsuMeta extends MetaProvider {
    override id = "kitsu";
    override url = "https://kitsu.io";

    public needsProxy: boolean = true;
    public useGoogleTranslate: boolean = false;

    override rateLimit = 0;
    override maxConcurrentRequests: number = -1;
    override formats: MediaFormat[] = [MediaFormat.TV, MediaFormat.MOVIE, MediaFormat.ONA, MediaFormat.SPECIAL, MediaFormat.TV_SHORT, MediaFormat.OVA, MediaFormat.MANGA, MediaFormat.ONE_SHOT, MediaFormat.NOVEL];

    private api = "https://kitsu.io/api/edge";

    override async search(query: string): Promise<IProviderResult[] | undefined> {
        const results: IProviderResult[] = [];

        try {
            const data = (await (
                await this.request(`${this.api}/anime?filter[text]=${encodeURIComponent(query)}`, {
                    headers: {
                        Accept: "application/vnd.api+json",
                        "Content-Type": "application/vnd.api+json",
                    },
                    validateResponse: async (response) => {
                        if (!response.ok) return false;
                        try {
                            const data = (await response.json()) as { data: IKitsuResult[] };
                            return data.data !== undefined;
                        } catch {
                            return false;
                        }
                    },
                })
            ).json()) as { data: IKitsuResult[] };

            if (data.data.length > 0) {
                data.data.forEach((result: IKitsuResult) => {
                    const altTitles = Object.values(result.attributes.titles).filter(Boolean).concat(result.attributes.abbreviatedTitles);

                    const formatString = result.attributes.subtype.toUpperCase();
                    const format: MediaFormat = Object.values(MediaFormat).includes(formatString as MediaFormat) ? (formatString as MediaFormat) : MediaFormat.UNKNOWN;

                    results.push({
                        title:
                            result.attributes.titles.en_us ||
                            result.attributes.titles.en_jp ||
                            result.attributes.titles.ja_jp ||
                            result.attributes.titles.en ||
                            result.attributes.titles.en_kr ||
                            result.attributes.titles.ko_kr ||
                            result.attributes.titles.en_cn ||
                            result.attributes.titles.zh_cn ||
                            result.attributes.canonicalTitle ||
                            Object.values(result.attributes.titles).filter(Boolean)[0],
                        altTitles,
                        id: result.id,
                        img: result.attributes.posterImage?.original ?? null,
                        format,
                        year: result.attributes.startDate ? new Date(result.attributes.startDate).getFullYear() : 0,
                        providerId: this.id,
                    });
                });
            }
        } catch {
            //
        }

        try {
            const data = (await (
                await this.request(`${this.api}/manga?filter[text]=${encodeURIComponent(query)}`, {
                    headers: {
                        Accept: "application/vnd.api+json",
                        "Content-Type": "application/vnd.api+json",
                    },
                    validateResponse: async (response) => {
                        if (!response.ok) return false;
                        try {
                            const data = (await response.json()) as { data: IKitsuResult[] };
                            return data.data !== undefined;
                        } catch {
                            return false;
                        }
                    },
                })
            ).json()) as { data: IKitsuResult[] };

            if (data.data.length > 0) {
                data.data.forEach((result: IKitsuResult) => {
                    const altTitles = Object.values(result.attributes.titles).filter(Boolean).concat(result.attributes.abbreviatedTitles);

                    const formatString = result.attributes.subtype.toUpperCase();
                    const format: MediaFormat = Object.values(MediaFormat).includes(formatString as MediaFormat) ? (formatString as MediaFormat) : MediaFormat.UNKNOWN;

                    results.push({
                        title:
                            result.attributes.titles.en_us ||
                            result.attributes.titles.en_jp ||
                            result.attributes.titles.ja_jp ||
                            result.attributes.titles.en ||
                            result.attributes.titles.en_kr ||
                            result.attributes.titles.ko_kr ||
                            result.attributes.titles.en_cn ||
                            result.attributes.titles.zh_cn ||
                            result.attributes.canonicalTitle ||
                            Object.values(result.attributes.titles).filter(Boolean)[0],
                        altTitles: altTitles,
                        id: result.id,
                        img: result.attributes.posterImage?.original ?? null,
                        format,
                        year: result.attributes.startDate ? new Date(result.attributes.startDate).getFullYear() : 0,
                        providerId: this.id,
                    });
                });
            }
        } catch {
            //
        }

        return results;
    }

    override async proxyCheck(proxyURL: string): Promise<boolean | undefined> {
        try {
            const results: IProviderResult[] = [];

            try {
                const data = (await (
                    await this.request(`${this.api}/anime?filter[text]=${encodeURIComponent("Mushoku Tensei")}`, {
                        proxy: proxyURL,
                        headers: {
                            Accept: "application/vnd.api+json",
                            "Content-Type": "application/vnd.api+json",
                        },
                        validateResponse: async (response) => {
                            if (!response.ok) return false;
                            try {
                                const data = (await response.json()) as { data: IKitsuResult[] };
                                return data.data !== undefined;
                            } catch {
                                return false;
                            }
                        },
                    })
                ).json()) as { data: IKitsuResult[] };

                if (data.data.length > 0) {
                    data.data.forEach((result: IKitsuResult) => {
                        const altTitles = Object.values(result.attributes.titles).filter(Boolean).concat(result.attributes.abbreviatedTitles);

                        const formatString = result.attributes.subtype.toUpperCase();
                        const format: MediaFormat = Object.values(MediaFormat).includes(formatString as MediaFormat) ? (formatString as MediaFormat) : MediaFormat.UNKNOWN;

                        results.push({
                            title:
                                result.attributes.titles.en_us ||
                                result.attributes.titles.en_jp ||
                                result.attributes.titles.ja_jp ||
                                result.attributes.titles.en ||
                                result.attributes.titles.en_kr ||
                                result.attributes.titles.ko_kr ||
                                result.attributes.titles.en_cn ||
                                result.attributes.titles.zh_cn ||
                                result.attributes.canonicalTitle ||
                                Object.values(result.attributes.titles).filter(Boolean)[0],
                            altTitles,
                            id: result.id,
                            img: result.attributes.posterImage?.original ?? null,
                            format,
                            year: result.attributes.startDate ? new Date(result.attributes.startDate).getFullYear() : 0,
                            providerId: this.id,
                        });
                    });
                }
            } catch {
                return false;
            }

            try {
                const data = (await (
                    await this.request(`${this.api}/manga?filter[text]=${encodeURIComponent("Mushoku Tensei")}`, {
                        proxy: proxyURL,
                        headers: {
                            Accept: "application/vnd.api+json",
                            "Content-Type": "application/vnd.api+json",
                        },
                        validateResponse: async (response) => {
                            if (!response.ok) return false;
                            try {
                                const data = (await response.json()) as { data: IKitsuResult[] };
                                return data.data !== undefined;
                            } catch {
                                return false;
                            }
                        },
                    })
                ).json()) as { data: IKitsuResult[] };

                if (data.data.length > 0) {
                    data.data.forEach((result: IKitsuResult) => {
                        const altTitles = Object.values(result.attributes.titles).filter(Boolean).concat(result.attributes.abbreviatedTitles);

                        const formatString = result.attributes.subtype.toUpperCase();
                        const format: MediaFormat = Object.values(MediaFormat).includes(formatString as MediaFormat) ? (formatString as MediaFormat) : MediaFormat.UNKNOWN;

                        results.push({
                            title:
                                result.attributes.titles.en_us ||
                                result.attributes.titles.en_jp ||
                                result.attributes.titles.ja_jp ||
                                result.attributes.titles.en ||
                                result.attributes.titles.en_kr ||
                                result.attributes.titles.ko_kr ||
                                result.attributes.titles.en_cn ||
                                result.attributes.titles.zh_cn ||
                                result.attributes.canonicalTitle ||
                                Object.values(result.attributes.titles).filter(Boolean)[0],
                            altTitles: altTitles,
                            id: result.id,
                            img: result.attributes.posterImage?.original ?? null,
                            format,
                            year: result.attributes.startDate ? new Date(result.attributes.startDate).getFullYear() : 0,
                            providerId: this.id,
                        });
                    });
                }
            } catch {
                return false;
            }

            return results.length > 0;
        } catch {
            return false;
        }
    }
}

interface IKitsuResult {
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
}
