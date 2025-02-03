/**
 * @fileoverview Type definitions for anime.
 */

/**
 * @description Interface for a source object that returns the
 * sources, subtitles, audio, intro, outro, and headers when extracting.
 */
export type ISource = {
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
    headers: { [key: string]: string };
};

/**
 * @description Interface for a server object that returns the name, url, and type for a source server.
 */
export type IServer = {
    name: string;
    url: string;
    type?: SubType;
};

/**
 * @description Enum for the sub type of the anime.
 */
export enum SubType {
    DUB = "dub",
    SUB = "sub",
}


/**
 * @description Enum for streaming servers that can be extracted.
 */
export enum StreamingServers {
    GogoCDN = "gogocdn",
    Kwik = "kwik",
    VidStreaming = "vidstreaming",
    StreamSB = "streamsb",
    VidCloud = "vidcloud",
    UpCloud = "upcloud",
    AnimeKaiMegacloud = "animekai-megacloud",
}
