import AnimeProvider from "./impl/anime";
import InformationProvider, { AnimeInfo, MangaInfo } from "./impl/information";
import AniList from "./impl/information/anilist";
import MangaProvider from "./impl/manga";
import ComicK from "./impl/manga/comicK";
import MAL from "./impl/information/mal";
import Kitsu from "./impl/information/kitsu";
import KitsuAnime from "./impl/meta/kitsuanime";
import KitsuManga from "./impl/meta/kitsumanga";
import NineAnime from "./impl/anime/nineanime";
import GogoAnime from "./impl/anime/gogoanime";
import Zoro from "./impl/anime/zoro";
import AnimePahe from "./impl/anime/animepahe";
import MangaDex from "./impl/manga/mangadex";
import MangaSee from "./impl/manga/mangasee";
import MetaProvider from "./impl/meta";
import NovelBuddy from "./impl/manga/novelbuddy";
import NovelUpdates from "./impl/manga/novelupdates";
import TMDB from "./impl/meta/tmdb";
import JNovels from "./impl/manga/jnovels";
import ReadLightNovels from "./impl/manga/readlightnovels";
import { EpisodeData } from "../content/impl/episodes";
import { ChapterData } from "../content/impl/chapters";
import MangaBuddy from "./impl/manga/mangabuddy";
import TheTVDB from "./impl/meta/tvdb";
import TVDB from "./impl/information/tvdb";
import SimklMeta from "./impl/meta/simkl";
import Simkl from "./impl/information/simkl";
import ColoredManga from "./impl/manga/coloredmanga";
import AnimeFlix from "./impl/anime/animeflix";

const ANIME_PROVIDERS: AnimeProvider[] = [new NineAnime(), new GogoAnime(), new Zoro(), new AnimePahe(), new AnimeFlix()];
const animeProviders: Record<string, AnimeProvider> = ANIME_PROVIDERS.reduce((acc, provider) => {
    acc[provider.id] = provider;
    return acc;
}, {});

const MANGA_PROVIDERS: MangaProvider[] = [new ComicK(), new MangaDex(), new MangaSee(), new NovelBuddy(), new NovelUpdates(), new JNovels(), new ReadLightNovels(), new MangaBuddy(), new ColoredManga()];
const mangaProviders: Record<string, MangaProvider> = MANGA_PROVIDERS.reduce((acc, provider) => {
    acc[provider.id] = provider;
    return acc;
}, {});

const INFORMATION_PROVIDERS: InformationProvider<Anime | Manga, AnimeInfo | MangaInfo>[] = [new AniList(), new MAL(), new Kitsu(), new TVDB(), new Simkl()];
const infoProviders: Record<string, InformationProvider<Anime | Manga, AnimeInfo | MangaInfo>> = INFORMATION_PROVIDERS.reduce((acc, provider) => {
    acc[provider.id] = provider;
    return acc;
}, {});

const META_PROVIDERS: MetaProvider[] = [new KitsuAnime(), new KitsuManga(), new TMDB(), new TheTVDB(), new SimklMeta()];
const metaProviders: Record<string, MetaProvider> = META_PROVIDERS.reduce((acc, provider) => {
    acc[provider.id] = provider;
    return acc;
}, {});

export { ANIME_PROVIDERS, MANGA_PROVIDERS, INFORMATION_PROVIDERS, META_PROVIDERS, animeProviders, mangaProviders, infoProviders, metaProviders };

export type Result = {
    id: string;
    title: string;
    altTitles: string[];
    year: number;
    format: Format;
    img: string | null;
    providerId: string;
};

export const enum ProviderType {
    ANIME = "ANIME",
    MANGA = "MANGA",
    META = "META",
    INFORMATION = "INFORMATION",
}

export const enum Type {
    ANIME = "ANIME",
    MANGA = "MANGA",
}

export const enum Format {
    TV = "TV",
    TV_SHORT = "TV_SHORT",
    MOVIE = "MOVIE",
    SPECIAL = "SPECIAL",
    OVA = "OVA",
    ONA = "ONA",
    MUSIC = "MUSIC",
    MANGA = "MANGA",
    NOVEL = "NOVEL",
    ONE_SHOT = "ONE_SHOT",
    UNKNOWN = "UNKNOWN",
}

export const Formats = [Format.TV, Format.TV_SHORT, Format.MOVIE, Format.SPECIAL, Format.OVA, Format.ONA, Format.MUSIC, Format.MANGA, Format.NOVEL, Format.ONE_SHOT, Format.UNKNOWN];

export const enum Season {
    WINTER = "WINTER",
    SPRING = "SPRING",
    SUMMER = "SUMMER",
    FALL = "FALL",
    UNKNOWN = "UNKNOWN",
}

export const enum MediaStatus {
    FINISHED = "FINISHED",
    RELEASING = "RELEASING",
    NOT_YET_RELEASED = "NOT_YET_RELEASED",
    CANCELLED = "CANCELLED",
    HIATUS = "HIATUS",
}

export const enum Genres {
    ACTION = "Action",
    ADVENTURE = "Adventure",
    ANIME_INFLUENCED = "Anime Influenced",
    AVANT_GARDE = "Avant Garde",
    AWARD_WINNING = "Award Winning",
    BOYS_LOVE = "Boys Love",
    CARS = "Cards",
    COMEDY = "Comedy",
    DEMENTIA = "Dementia",
    DEMONS = "Demons",
    DOUJINSHI = "Doujinshi",
    DRAMA = "Drama",
    ECCHI = "Ecchi",
    EROTICA = "Erotica",
    FAMILY = "Family",
    FANTASY = "Fantasy",
    FOOD = "Food",
    FRIENDSHIP = "Friendship",
    GAME = "Game",
    GENDER_BENDER = "Gender Bender",
    GIRLS_LOVE = "Girls Love",
    GORE = "Gore",
    GOURMET = "Gourmet",
    HAREM = "Harem",
    HENTAI = "Hentai",
    HISTORICAL = "Historical",
    HORROR = "Horror",
    ISEKAI = "Isekai",
    KIDS = "Kids",
    MAGIC = "Magic",
    MAHOU_SHOUJO = "Mahou Shoujo",
    MARTIAL_ARTS = "Martial Arts",
    MECHA = "Mecha",
    MEDICAL = "Medical",
    MILITARY = "Military",
    MUSIC = "Music",
    MYSTERY = "Mystery",
    PARODY = "Parody",
    POLICE = "Police",
    POLITICAL = "Political",
    PSYCHOLOGICAL = "Psychological",
    RACING = "Racing",
    ROMANCE = "Romance",
    SAMURAI = "Samurai",
    SCHOOL = "School",
    SCI_FI = "Sci-Fi",
    SHOUJO_AI = "Shoujo Ai",
    SHOUNEN_AI = "Shounen Ai",
    SLICE_OF_LIFE = "Slice of Life",
    SPACE = "Space",
    SPORTS = "Sports",
    SUPER_POWER = "Super Power",
    SUPERNATURAL = "Supernatural",
    SUSPENCE = "Suspence",
    THRILLER = "Thriller",
    VAMPIRE = "Vampire",
    WORKPLACE = "Workplace",
    YAOI = "Yaoi",
    YURI = "Yuri",
    ZOMBIES = "Zombies",
}

export type Anime = {
    id: string;
    slug: string;
    coverImage: string | null;
    bannerImage: string | null;
    trailer: string | null;
    status: MediaStatus | null;
    season: Season;
    title: {
        romaji: string | null;
        english: string | null;
        native: string | null;
    };
    currentEpisode: number | null;
    mappings: { id: string; providerId: string; similarity: number; providerType: ProviderType | null }[];
    synonyms: string[];
    countryOfOrigin: string | null;
    description: string | null;
    duration: number | null;
    color: string | null;
    year: number | null;
    rating: {
        anilist: number;
        mal: number;
        kitsu: number;
    };
    popularity: {
        anilist: number;
        mal: number;
        kitsu: number;
    };
    type: Type;
    genres: Genres[];
    format: Format;
    relations: Relations[];
    totalEpisodes?: number;
    episodes: {
        latest: {
            updatedAt: number;
            latestEpisode: number;
            latestTitle: string;
        };
        data: EpisodeData[];
    };
    tags: string[];
    artwork: Artwork[];
    characters: Character[];
};

export type Manga = {
    id: string;
    slug: string;
    coverImage: string | null;
    bannerImage: string | null;
    status: MediaStatus | null;
    title: {
        romaji: string | null;
        english: string | null;
        native: string | null;
    };
    mappings: { id: string; providerId: string; similarity: number; providerType: ProviderType | null }[];
    synonyms: string[];
    countryOfOrigin: string | null;
    description: string | null;
    totalVolumes: number | null;
    color: string | null;
    year: number | null;
    rating: {
        anilist: number;
        mal: number;
        kitsu: number;
    };
    popularity: {
        anilist: number;
        mal: number;
        kitsu: number;
    };
    genres: Genres[];
    type: Type;
    format: Format;
    relations: Relations[];
    totalChapters: number | null;
    chapters: {
        latest: {
            updatedAt: number;
            latestChapter: number;
            latestTitle: string;
        };
        data: ChapterData[];
    };
    tags: string[];
    artwork: Artwork[];
    characters: Character[];
};

export interface Character {
    name: string;
    image: string;
    voiceActor: {
        name: string;
        image: string;
    };
}

export type Relations = {
    id: string;
    type: Type;
    title: {
        english: string | null;
        romaji: string | null;
        native: string | null;
    };
    format: Format;
    relationType: string;
};

export type Artwork = {
    type: "banner" | "poster" | "clear_logo" | "top_banner" | "icon" | "clear_art";
    img: string;
    providerId: string;
};
