import { Anime, AnimeInfo, Manga, MangaInfo } from "../types/types";
import AnimeProvider from "./impl/anime";
import AnimePahe from "./impl/anime/animepahe";
import NineAnime from "./impl/anime/nineanime";
import BaseProvider from "./impl/base";
import AniListBase from "./impl/base/anilist";
import InformationProvider from "./impl/information";
import AniList from "./impl/information/anilist";
import MangaProvider from "./impl/manga";
import MetaProvider from "./impl/meta";
import TheTVDB from "./impl/meta/tvdb";

const ANIME_PROVIDERS: AnimeProvider[] = [new NineAnime(), new AnimePahe()];
const animeProviders: Record<string, AnimeProvider> = ANIME_PROVIDERS.reduce(
    (acc, provider) => {
        acc[provider.id] = provider;
        return acc;
    },
    {} as Record<string, AnimeProvider>,
);

const MANGA_PROVIDERS: MangaProvider[] = [];
const mangaProviders: Record<string, MangaProvider> = MANGA_PROVIDERS.reduce(
    (acc, provider) => {
        acc[provider.id] = provider;
        return acc;
    },
    {} as Record<string, MangaProvider>,
);

const INFORMATION_PROVIDERS: InformationProvider<Anime | Manga, AnimeInfo | MangaInfo>[] = [new AniList()];
const infoProviders: Record<string, InformationProvider<Anime | Manga, AnimeInfo | MangaInfo>> = INFORMATION_PROVIDERS.reduce(
    (acc, provider) => {
        acc[provider.id] = provider;
        return acc;
    },
    {} as Record<string, InformationProvider<Anime | Manga, AnimeInfo | MangaInfo>>,
);

const META_PROVIDERS: MetaProvider[] = [new TheTVDB()];
const metaProviders: Record<string, MetaProvider> = META_PROVIDERS.reduce(
    (acc, provider) => {
        acc[provider.id] = provider;
        return acc;
    },
    {} as Record<string, MetaProvider>,
);

const BASE_PROVIDERS: BaseProvider[] = [new AniListBase()];
const baseProviders: Record<string, BaseProvider> = BASE_PROVIDERS.reduce(
    (acc, provider) => {
        acc[provider.id] = provider;
        return acc;
    },
    {} as Record<string, BaseProvider>,
);

export { ANIME_PROVIDERS, animeProviders, MANGA_PROVIDERS, mangaProviders, INFORMATION_PROVIDERS, infoProviders, META_PROVIDERS, metaProviders, BASE_PROVIDERS, baseProviders };
