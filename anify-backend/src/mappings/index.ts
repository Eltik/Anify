export const BASE_PROVIDERS = [
    async () => {
        const { default: AniListBase } = await import("./impl/base/impl/anilist");
        return new AniListBase();
    },
    async () => {
        const { default: MangaDexBase } = await import("./impl/base/impl/mangadex");
        return new MangaDexBase();
    },
    async () => {
        const { default: NovelUpdatesBase } = await import("./impl/base/impl/novelupdates");
        return new NovelUpdatesBase();
    },
];

export const ANIME_PROVIDERS = [
    async () => {
        const { default: AnimePahe } = await import("./impl/anime/impl/animepahe");
        return new AnimePahe();
    },
    async () => {
        const { default: HiAnime } = await import("./impl/anime/impl/hianime");
        return new HiAnime();
    },
];

export const MANGA_PROVIDERS = [
    async () => {
        const { default: MangaDex } = await import("./impl/manga/impl/mangadex");
        return new MangaDex();
    },
    async () => {
        const { default: FirstKissNovel } = await import("./impl/manga/impl/1stkissnovel");
        return new FirstKissNovel();
    },
    async () => {
        const { default: ComicK } = await import("./impl/manga/impl/comick");
        return new ComicK();
    },
    async () => {
        const { default: JNovels } = await import("./impl/manga/impl/jnovels");
        return new JNovels();
    },
    async () => {
        const { default: MangaFire } = await import("./impl/manga/impl/mangafire");
        return new MangaFire();
    },
    async () => {
        const { default: Mangakakalot } = await import("./impl/manga/impl/mangakakalot");
        return new Mangakakalot();
    },
    async () => {
        const { default: MangaPill } = await import("./impl/manga/impl/mangapill");
        return new MangaPill();
    },
    async () => {
        const { default: NovelUpdates } = await import("./impl/manga/impl/novelupdates");
        return new NovelUpdates();
    },
];

export const INFORMATION_PROVIDERS = [
    async () => {
        const { default: AniList } = await import("./impl/information/impl/anilist");
        return new AniList();
    },
    async () => {
        const { default: AniDB } = await import("./impl/information/impl/anidb");
        return new AniDB();
    },
    async () => {
        const { default: ComicKInfo } = await import("./impl/information/impl/comick");
        return new ComicKInfo();
    },
    async () => {
        const { default: KitsuInformation } = await import("./impl/information/impl/kitsu");
        return new KitsuInformation();
    },
    async () => {
        const { default: MALInformation } = await import("./impl/information/impl/mal");
        return new MALInformation();
    },
    async () => {
        const { default: MangaDexInformation } = await import("./impl/information/impl/mangadex");
        return new MangaDexInformation();
    },
    async () => {
        const { default: NovelUpdatesInformation } = await import("./impl/information/impl/novelupdates");
        return new NovelUpdatesInformation();
    },
    async () => {
        const { default: TMDBInformation } = await import("./impl/information/impl/tmdb");
        return new TMDBInformation();
    },
    async () => {
        const { default: TVDBInformation } = await import("./impl/information/impl/tvdb");
        return new TVDBInformation();
    },
];

export const META_PROVIDERS = [
    async () => {
        const { default: AniListMeta } = await import("./impl/meta/impl/anilist");
        return new AniListMeta();
    },
    // async () => {
    //     const { default: AniDBMeta } = await import("./impl/meta/impl/anidb");
    //     return new AniDBMeta();
    // },
    async () => {
        const { default: KitsuMeta } = await import("./impl/meta/impl/kitsu");
        return new KitsuMeta();
    },
    async () => {
        const { default: MALMeta } = await import("./impl/meta/impl/mal");
        return new MALMeta();
    },
    async () => {
        const { default: TMDBMeta } = await import("./impl/meta/impl/tmdb");
        return new TMDBMeta();
    },
    async () => {
        const { default: TVDBMeta } = await import("./impl/meta/impl/tvdb");
        return new TVDBMeta();
    },
];

export const PROVIDERS = Promise.all([...BASE_PROVIDERS.map((provider) => provider()), ...ANIME_PROVIDERS.map((provider) => provider()), ...MANGA_PROVIDERS.map((provider) => provider()), ...INFORMATION_PROVIDERS.map((provider) => provider()), ...META_PROVIDERS.map((provider) => provider())]);
