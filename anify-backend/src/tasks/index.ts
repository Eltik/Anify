import Database from "../database";
import { wait } from "../helper";
import { generateQueryBuilder } from "../helper/generator";
import { checkCorsProxies, scrapeCorsProxies } from "../helper/proxies";
import { loadMapping } from "../lib/mappings";
import { Anime, Manga, ProviderType, Type } from "../mapping";
import { AnimeInfo, MangaInfo } from "../mapping/impl/information";
import AniList from "../mapping/impl/information/anilist";
import colors from "colors";
import { returnCreatedEntry } from "../lib/entry";
import { flushSafely, updateRequests } from "../keys";

export async function createLoop(): Promise<void> {
    setInterval(async () => {
        await checkCorsProxies();
        await updateRequests();
        await flushSafely();
    }, 1000 * 60 * 60 * 12); // 12 hours

    setInterval(async () => {
        await scrapeCorsProxies();

        //await remap(Type.ANIME);
        //await remap(Type.MANGA);
    }, 1000 * 60 * 60 * 24 * 2); // 2 days
}

export async function remap(type: Type): Promise<void> {
    const data = await Database.fetchAll(type);

    const aniList = new AniList();
    const season = aniList.getCurrentSeason();

    const toRemap: string[] = [];

    for (const media of data) {
        const mappings = media.mappings.filter((item) => item.providerType === ProviderType.ANIME || item.providerType === ProviderType.MANGA);
        if (mappings.length < 3) {
            await Database.delete(media.id);
            console.log(colors.red("Deleted ") + media.title.english ?? media.title.romaji ?? media.title.native + colors.red("."));
            toRemap.push(media.id);
        }
    }

    if (type === Type.ANIME) {
        for (const media of data) {
            if (toRemap.find((x) => x === media.id)) continue;
            if ((media as Anime).season === season && (media as Anime).year === new Date(Date.now()).getFullYear()) {
                await Database.delete(media.id);
                console.log(colors.red("Deleted ") + media.title.english ?? media.title.romaji ?? media.title.native + colors.red("."));
                toRemap.push(media.id);
            }
        }
    }

    console.log(colors.yellow("Remapping in 3 seconds..."));

    await wait(3000);

    const chunkSize = 10;
    for (let i = 0; i < toRemap.length; i += chunkSize) {
        try {
            const now = Date.now();
            const chunk = toRemap.slice(i, i + chunkSize);
            const queries: string[] = [];
            await Promise.all(chunk.map((id) => queries.push(generateQueryBuilder(id))));
            const results = await aniList.batchRequest(queries, 5);

            if (results.length === 0) continue;
            const batchResults: AnimeInfo[] | MangaInfo[] = results
                .reduce((accumulator, currentObject) => {
                    const mediaArrays = Object.values(currentObject).map((anime: any) => anime.media);
                    return accumulator.concat(...mediaArrays);
                }, [])
                .map((x: any) => {
                    if (!x) return null;
                    x.year = x.startDate?.year ?? x.seasonYear ?? 0;
                    return x;
                })
                .filter(Boolean);

            const map = await Promise.all(batchResults.map((info: AnimeInfo | MangaInfo) => mapId(info)));
            const data = map
                .filter((x) => x.success && x.data !== undefined)
                .map((x) => x.data as Anime[] | Manga[])
                .flat();

            const toInsert = data.map((x) => returnCreatedEntry(x));

            // No need to insert since the mapId function listens to the insert event

            console.log(colors.gray("Tried to insert " + toInsert.length + " entries into the database."));

            const end = Date.now();

            console.log(colors.green("Finished fetching data for " + map.filter((x) => x.success).length + "/" + map.length + "anime \n Time taken: " + (end - now) + "ms"));
        } catch (err) {
            console.log(colors.red("Chunk failed. Fatal error."));
            console.log(err);
        }
    }

    console.log(colors.green("Remapping finished."));

    async function mapId(aniData: AnimeInfo | MangaInfo) {
        let isSuccess = false;
        try {
            const start = new Date(Date.now());
            const data = await loadMapping({ id: (aniData as any).id?.toString(), type: type }, aniData);
            isSuccess = true;

            const end = new Date(Date.now());
            console.log(colors.gray("Finished fetching data. Request(s) took ") + colors.cyan(String(end.getTime() - start.getTime())) + colors.gray(" milliseconds."));
            return { id: (aniData as any).id?.toString(), success: isSuccess, data: data };
        } catch (err) {
            console.log(err);
            return { id: (aniData as any).id?.toString(), success: isSuccess };
        }
    }
}
