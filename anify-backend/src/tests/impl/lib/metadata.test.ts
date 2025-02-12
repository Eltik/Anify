import { expect, test } from "bun:test";
import lib from "../../../lib";
import { MediaFormat, MediaSeason, MediaType, ProviderType } from "../../../types";
import { env } from "../../../env";
import { preloadProxies } from "../../../proxies/impl/manager/impl/file/preloadProxies";

test(
    "Content.MetadataHandler",
    async (done) => {
        await preloadProxies();

        const metadata = await lib.content.loadMetadata({
            artwork: [],
            averagePopularity: null,
            averageRating: null,
            bannerImage: null,
            characters: [],
            color: null,
            coverImage: null,
            countryOfOrigin: null,
            createdAt: new Date(Date.now()),
            description: null,
            currentEpisode: 0,
            duration: null,
            episodes: {
                data: [],
                latest: {
                    latestEpisode: 0,
                    latestTitle: "",
                    updatedAt: 0,
                },
            },
            format: MediaFormat.TV,
            genres: [],
            id: "21",
            mappings: [
                {
                    id: "21",
                    providerId: "anilist",
                    providerType: ProviderType.INFORMATION,
                    similarity: 1,
                },
                {
                    id: "/anime/69",
                    providerId: "anidb",
                    providerType: ProviderType.INFORMATION,
                    similarity: 1,
                },
            ],
            popularity: null,
            rating: null,
            relations: [],
            season: MediaSeason.UNKNOWN,
            slug: "mushoku-tensei-isekai-ittara-honki-dasu",
            status: null,
            synonyms: [],
            tags: [],
            title: {
                english: "Mushoku Tensei: Jobless Reincarnation",
                native: "無職転生 ～異世界行ったら本気だす～",
                romaji: "Mushoku Tensei: Isekai Ittara Honki Dasu",
            },
            totalEpisodes: 0,
            trailer: null,
            type: MediaType.ANIME,
            year: 1999,
        });

        if (env.DEBUG) {
            console.log(metadata);
        }

        expect(metadata).not.toBeEmpty();

        done();
    },
    {
        timeout: 30000,
    },
);
