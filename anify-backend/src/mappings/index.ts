import { Anime, AnimeInfo, Manga, MangaInfo } from "../types/types";
import AnimeProvider from "./impl/anime";
import AnimePahe from "./impl/anime/animepahe";
import GogoAnime from "./impl/anime/gogoanime";
import NineAnime from "./impl/anime/nineanime";
import Zoro from "./impl/anime/zoro";
import BaseProvider from "./impl/base";
import AniListBase from "./impl/base/anilist";
import ManagDexBase from "./impl/base/mangadex";
import NovelUpdatesBase from "./impl/base/novelupdates";
import InformationProvider from "./impl/information";
import AniDB from "./impl/information/anidb";
import AniList from "./impl/information/anilist";
import ComicKInfo from "./impl/information/comick";
import Kitsu from "./impl/information/kitsu";
import MAL from "./impl/information/mal";
import MangaDexInfo from "./impl/information/mangadex";
import NovelUpdatesInfo from "./impl/information/novelupdates";
import TMDB from "./impl/information/tmdb";
import TVDB from "./impl/information/tvdb";
import MangaProvider from "./impl/manga";
import FirstKissNovel from "./impl/manga/1stkissnovel";
import ComicK from "./impl/manga/comick";
import JNovels from "./impl/manga/jnovels";
import MangaDex from "./impl/manga/mangadex";
import MangaFire from "./impl/manga/mangafire";
import Mangakakalot from "./impl/manga/mangakakalot";
import MangaPill from "./impl/manga/mangapill";
import MangaSee from "./impl/manga/mangasee";
import NovelUpdates from "./impl/manga/novelupdates";
import NovelHall from "./impl/manga/novelhall";
import MetaProvider from "./impl/meta";
import AniDBMeta from "./impl/meta/anidb";
import AniListMeta from "./impl/meta/anilist";
import KitsuMeta from "./impl/meta/kitsu";
import MALMeta from "./impl/meta/mal";
import TheMovieDB from "./impl/meta/tmdb";
import TheTVDB from "./impl/meta/tvdb";

const ANIME_PROVIDERS: AnimeProvider[] = [new NineAnime(), new AnimePahe(), new GogoAnime(), new Zoro()];
const animeProviders: Record<string, AnimeProvider> = ANIME_PROVIDERS.reduce(
    (acc, provider) => {
        acc[provider.id] = provider;
        return acc;
    },
    {} as Record<string, AnimeProvider>,
);

const MANGA_PROVIDERS: MangaProvider[] = [new ComicK(), new MangaDex(), new MangaSee(), new MangaFire(), new Mangakakalot(), new MangaPill(), new JNovels(), new NovelUpdates(), new FirstKissNovel(), new NovelHall()];
const mangaProviders: Record<string, MangaProvider> = MANGA_PROVIDERS.reduce(
    (acc, provider) => {
        acc[provider.id] = provider;
        return acc;
    },
    {} as Record<string, MangaProvider>,
);

const INFORMATION_PROVIDERS: InformationProvider<Anime | Manga, AnimeInfo | MangaInfo>[] = [new AniList(), new Kitsu(), new MAL(), new AniDB(), new TVDB(), new TMDB(), new ComicKInfo(), new MangaDexInfo(), new NovelUpdatesInfo()];
const infoProviders: Record<string, InformationProvider<Anime | Manga, AnimeInfo | MangaInfo>> = INFORMATION_PROVIDERS.reduce(
    (acc, provider) => {
        acc[provider.id] = provider;
        return acc;
    },
    {} as Record<string, InformationProvider<Anime | Manga, AnimeInfo | MangaInfo>>,
);

const META_PROVIDERS: MetaProvider[] = [new TheTVDB(), new AniListMeta(), new MALMeta(), new KitsuMeta(), new TheMovieDB(), new AniDBMeta()];
const metaProviders: Record<string, MetaProvider> = META_PROVIDERS.reduce(
    (acc, provider) => {
        acc[provider.id] = provider;
        return acc;
    },
    {} as Record<string, MetaProvider>,
);

const BASE_PROVIDERS: BaseProvider[] = [new AniListBase(), new ManagDexBase(), new NovelUpdatesBase()];
const baseProviders: Record<string, BaseProvider> = BASE_PROVIDERS.reduce(
    (acc, provider) => {
        acc[provider.id] = provider;
        return acc;
    },
    {} as Record<string, BaseProvider>,
);

export { ANIME_PROVIDERS, animeProviders, MANGA_PROVIDERS, mangaProviders, INFORMATION_PROVIDERS, infoProviders, META_PROVIDERS, metaProviders, BASE_PROVIDERS, baseProviders };
