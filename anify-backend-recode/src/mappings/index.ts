import { Anime, AnimeInfo, Manga, MangaInfo } from "../types/types";
import AnimeProvider from "./impl/anime";
import AnimePahe from "./impl/anime/animepahe";
import GogoAnime from "./impl/anime/gogoanime";
import NineAnime from "./impl/anime/nineanime";
import Zoro from "./impl/anime/zoro";
import BaseProvider from "./impl/base";
import AniListBase from "./impl/base/anilist";
import InformationProvider from "./impl/information";
import AniList from "./impl/information/anilist";
import Kitsu from "./impl/information/kitsu";
import MAL from "./impl/information/mal";
import TVDB from "./impl/information/tvdb";
import MangaProvider from "./impl/manga";
import MetaProvider from "./impl/meta";
import AniListMeta from "./impl/meta/anilist";
import KitsuMeta from "./impl/meta/kitsu";
import MALMeta from "./impl/meta/mal";
import TMDB from "./impl/meta/tmdb";
import TheTVDB from "./impl/meta/tvdb";

const ANIME_PROVIDERS: AnimeProvider[] = [new NineAnime(), new AnimePahe(), new GogoAnime(), new Zoro()];
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

const INFORMATION_PROVIDERS: InformationProvider<Anime | Manga, AnimeInfo | MangaInfo>[] = [new AniList(), new Kitsu(), new MAL(), new TVDB()];
const infoProviders: Record<string, InformationProvider<Anime | Manga, AnimeInfo | MangaInfo>> = INFORMATION_PROVIDERS.reduce(
    (acc, provider) => {
        acc[provider.id] = provider;
        return acc;
    },
    {} as Record<string, InformationProvider<Anime | Manga, AnimeInfo | MangaInfo>>,
);

const META_PROVIDERS: MetaProvider[] = [new TheTVDB(), new AniListMeta(), new MALMeta(), new KitsuMeta(), new TMDB()];
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
