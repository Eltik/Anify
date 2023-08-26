import { Anime } from "../../../mapping";
import AniList from "../../../mapping/impl/information/anilist";
import Simkl from "../../../mapping/impl/information/simkl";
import TMDB from "../../../mapping/impl/meta/tmdb";

export const loadEpisodeCovers = async (anime: Anime): Promise<{ episode: number; img: string }[] | undefined> => {
    const simklMapping = anime.mappings.find((mapping) => mapping.providerId === "simkl");
    if (!simklMapping) {
        const tmdbMapping = anime.mappings.find((mapping) => mapping.providerId === "tmdb");
        if (!tmdbMapping) {
            // Fetch from Kitsu and AniList
            const aniList = new AniList();
            const info = await aniList.getMedia(anime.id);
            const streamingEpisodes = (info as any)?.streamingEpisodes ?? [];

            const episodes: { episode: number; img: string }[] = [];

            for (let i = 0; i < streamingEpisodes.length; i++) {
                episodes.push({
                    episode: i + 1,
                    img: streamingEpisodes[i].thumbnail,
                });
            }

            if (episodes.length > 0) return episodes;

            return undefined;

            // Slow
            /*
            const kitsuMapping = anime.mappings.find((mapping) => mapping.providerId === "kitsuanime" || mapping.providerId === "kitsu");
            const kitsu = new Kitsu();
            return kitsu.getEpisodeCovers(kitsuMapping?.id ?? anime.id);
            */
        }

        const tmdb = new TMDB();
        return tmdb.getEpisodeCovers(tmdbMapping.id, 1);
    } else {
        const simkl = new Simkl();
        return simkl.getEpisodeCovers(simklMapping.id);
    }
};
