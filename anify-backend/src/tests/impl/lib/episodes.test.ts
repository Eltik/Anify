import { expect, test } from "bun:test";
import { init as initDB } from "../../../database";
import lib from "../../../lib";
import { MediaFormat, MediaSeason, MediaType, ProviderType } from "../../../types";
import { env } from "../../../env";
import { preloadProxies } from "../../../proxies/impl/manager/impl/file/preloadProxies";

test(
    "Content.EpisodesHandler",
    async (done) => {
        await initDB();
        await preloadProxies();

        const episodes = await lib.content.loadEpisodes({
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
            id: "108465",
            mappings: [
                {
                    id: "4",
                    providerId: "animepahe",
                    providerType: ProviderType.ANIME,
                    similarity: 1,
                },
                {
                    id: "/category/one-piece",
                    providerId: "gogoanime",
                    providerType: ProviderType.ANIME,
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
            year: 2021,
        });

        if (env.DEBUG) {
            console.log(episodes);
        }

        expect(episodes).not.toBeEmpty();

        done();
    },
    {
        timeout: 30000,
    },
);
