import dotenv from "dotenv";
dotenv.config();

import colors from "colors";
import { loadMapping } from "./lib/mappings";

import { CORS_PROXIES, fetchCorsProxies } from "./helper/proxies";
import { AnimeInfo, MangaInfo } from "./mapping/impl/information";
import { returnCreatedEntry } from "./lib/entry";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import Database from "./database";
import { generateQueryBuilder } from "./helper/generator";
import { Anime, Manga, Type } from "./mapping";
import AniList from "./mapping/impl/information/anilist";

const type: Type = Type.ANIME;

(async () => {
    await fetchCorsProxies();
    if (CORS_PROXIES.length === 0) {
        console.log(colors.yellow("WARNING: No CORS proxies were found. This may cause possible IP bans, rate limit issues, and more. It is recommended to run ") + colors.green("npm run create:proxies") + colors.yellow(" to generate a list of proxies."));
    }

    const aniList = new AniList();
    //const ids: string[] = await getPopularIds();
    const ids: string[] = type === Type.ANIME ? await getAnimeIDs() : await getMangaIDs();
    //const ids: string[] = ["108465"];

    const idsToRemove: string[] = [];
    const media = await Database.fetchAll(type);
    media.forEach((media) => {
        idsToRemove.push(media.id);
    });
    const numbersSet: Set<string> = new Set(idsToRemove);
    const cleanedIds: string[] = ids.filter((str) => !numbersSet.has(str));
    console.log(colors.gray("Found " + ids.length + " IDs, " + cleanedIds.length + " of which are not in the database."));

    const chunkSize = 10;
    for (let i = 0; i < cleanedIds.length; i += chunkSize) {
        try {
            const now = Date.now();
            const chunk = cleanedIds.slice(i, i + chunkSize);
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

            console.log(colors.gray("Starting to insert " + toInsert.length + " entries into the database."));

            try {
                await Database.createEntrys(toInsert as Anime[] | Manga[]).catch((err) => {
                    console.error(err);
                    console.log(colors.red("Create Many failed."));
                });
            } catch {
                console.log(colors.red("Create Many error."));
            }

            console.log(colors.gray("Tried to insert " + toInsert.length + " entries into the database."));

            const end = Date.now();

            console.log(colors.green("Finished fetching data for " + map.filter((x) => x.success).length + "/" + map.length + `${type.toLowerCase()} \n Time taken: ` + (end - now) + "ms"));
        } catch (err) {
            console.log(colors.red("Chunk failed. Fatal error."));
            console.log(err);
        }
    }
    console.log(colors.green("Crawling finished."));

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

    async function getAnimeIDs(): Promise<string[]> {
        const idList = await (await fetch("https://raw.githubusercontent.com/5H4D0WILA/IDFetch/main/ids.txt")).text();
        const ids: string[] = idList.split("\n");
        return ids;
    }

    /**
     * @description Fetches all manga AniList ID's from AniList's sitemap
     * @returns Promise<string[]>
     */
    async function getMangaIDs(): Promise<string[]> {
        const req1 = await fetch("https://anilist.co/sitemap/manga-0.xml");
        const data1 = await req1.text();
        const req2 = await fetch("https://anilist.co/sitemap/manga-1.xml");
        const data2 = await req2.text();

        const ids1 = data1.match(/manga\/([0-9]+)/g)?.map((id) => {
            return id.replace("manga/", "");
        });

        const ids2 = data2.match(/manga\/([0-9]+)/g)?.map((id) => {
            return id.replace("manga/", "");
        });
        return ids1?.concat(ids2 as string[]) ?? [];
    }
})();

async function getPopularIds() {
    if (existsSync(join(__dirname, "./popularIds.json"))) {
        const popularIds = JSON.parse(readFileSync(join(__dirname, "./popularIds.json")).toString()) as string[];
        return uniqByFilter(popularIds);
    } else {
        const fetches = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((x) => fetch("https://c.delusionz.xyz/meta/anilist/trending?page=" + x + "&perPage=1000"));
        const datas = await Promise.all(fetches);
        const jsons = await Promise.all(datas.map((x) => x.json()));

        const ids = jsons
            .map((x) => {
                return x.results.map((y) => {
                    return y.id as string;
                }) as string[];
            })
            .flat();
        writeFileSync(join(__dirname, "./popularIds.json"), JSON.stringify(ids, null, 4));
        return ids;
    }
}
function uniqByFilter<T>(array: T[]) {
    return array.filter((value, index) => array.indexOf(value) === index);
}
