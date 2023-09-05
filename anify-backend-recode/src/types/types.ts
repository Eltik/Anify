import { Format, Genres, MediaStatus, ProviderType, Season, SubType, Type } from "./enums";

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
    averageRating?: number;
    averagePopularity?: number;
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
    averageRating?: number;
    averagePopularity?: number;
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

export type EpisodeData = {
    providerId: string;
    episodes: Episode[];
};

export type Episode = {
    id: string;
    title: string;
    number: number;
    isFiller: boolean;
    img: string | null;
    hasDub: boolean;
    updatedAt?: number;
};

export type ChapterData = {
    providerId: string;
    chapters: Chapter[];
};

export type Chapter = {
    id: string;
    title: string;
    number: number;
    updatedAt?: number;
    mixdrop?: string;
};

export type Page = {
    url: string;
    index: number;
    headers: { [key: string]: string };
};

export type Source = {
    sources: { url: string; quality: string }[];
    subtitles: { url: string; lang: string; label: string }[];
    audio: { url: string; name: string; language: string }[];
    intro: {
        start: number;
        end: number;
    };
    outro: {
        start: number;
        end: number;
    };
    headers: Record<string, string>;
};

export type Server = {
    name: string;
    url: string;
    type?: SubType;
};

export type Result = {
    id: string;
    title: string;
    altTitles: string[];
    year: number;
    format: Format;
    img: string | null;
    providerId: string;
};
