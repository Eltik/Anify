import { Anime, AnimeInfo, Manga, MangaInfo } from "../types/types";
import AnimeProvider from "./impl/anime";
import NineAnime from "./impl/anime/nineanime";
import InformationProvider from "./impl/information";
import MangaProvider from "./impl/manga";
import MetaProvider from "./impl/meta";

const ANIME_PROVIDERS: AnimeProvider[] = [new NineAnime()];
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

const INFORMATION_PROVIDERS: InformationProvider<Anime | Manga, AnimeInfo | MangaInfo>[] = [];
const infoProviders: Record<string, InformationProvider<Anime | Manga, AnimeInfo | MangaInfo>> = INFORMATION_PROVIDERS.reduce(
    (acc, provider) => {
        acc[provider.id] = provider;
        return acc;
    },
    {} as Record<string, InformationProvider<Anime | Manga, AnimeInfo | MangaInfo>>,
);

const META_PROVIDERS: MetaProvider[] = [];
const metaProviders: Record<string, MetaProvider> = META_PROVIDERS.reduce(
    (acc, provider) => {
        acc[provider.id] = provider;
        return acc;
    },
    {} as Record<string, MetaProvider>,
);

export { ANIME_PROVIDERS, animeProviders, MANGA_PROVIDERS, mangaProviders, INFORMATION_PROVIDERS, infoProviders, META_PROVIDERS, metaProviders };
