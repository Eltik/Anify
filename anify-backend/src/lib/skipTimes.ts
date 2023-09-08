import emitter, { Events } from "@/src/helper/event";
import { Source } from "../mapping/impl/anime";
import AniList from "../mapping/impl/information/anilist";
import colors from "colors";
import Database from "../database";

export const loadSkipTimes = async (data: { id: string; episode: number; toInsert?: Source }): Promise<{ number: number; intro: { start: number; end: number }; outro: { start: number; end: number } } | null> => {
    const existing = await Database.findSkipTimes(data.id);

    if (existing) {
        for (let i = 0; i < existing.episodes.length; i++) {
            if (existing.episodes[i].number === data.episode) {
                await emitter.emitAsync(Events.COMPLETED_SKIPTIMES_LOAD, existing.episodes[i]);
                return existing.episodes[i];
            }
        }
    }

    if (!data.toInsert) {
        await emitter.emitAsync(Events.COMPLETED_SKIPTIMES_LOAD, null);
        return null;
    }

    let toInsert;
    if (!existing) {
        toInsert = {
            id: data.id,
            episodes: [],
        };
    } else {
        toInsert = existing;
    }
    if (data.toInsert.intro.end > 0 || data.toInsert.outro.end > 0) {
        toInsert.episodes.push({
            intro: data.toInsert.intro,
            outro: data.toInsert.outro,
            number: data.episode,
        });
    }

    await Database.updateSkipTimes(data.id, toInsert.episodes);

    // temp
    console.log(colors.green(`Inserted skip times for ${data.id} episode ${data.episode}`));

    const skipTimes = toInsert.episodes.find((e) => e.number === data.episode);
    if (!skipTimes) {
        await emitter.emitAsync(Events.COMPLETED_SKIPTIMES_LOAD, null);
        return null;
    }

    await emitter.emitAsync(Events.COMPLETED_SKIPTIMES_LOAD, skipTimes);
    return skipTimes;
};

export async function insertAllSkipTimes() {
    const aniList = new AniList();
    const data = await (await fetch(`https://raw.githubusercontent.com/Eltik/episodescrape/master/data/compiled/aniskip.json`)).json();
    for (let i = 0; i < Object.entries(data).length; i++) {
        const malId = Object.entries(data)[i][0];

        const query = `query ($id: Int) {
            Media (id: $id) {
                id
                title {
                    romaji
                    english
                    native
                    userPreferred
                }
            }
        }`;
        const variables = {
            id: parseInt(malId),
        };

        const req = await aniList.request("https://graphql.anilist.co", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Accept: "application/json",
            },
            body: JSON.stringify({
                query,
                variables,
            }),
        });
        const media = (await req.json()).data.Media;

        const existing = await Database.findSkipTimes(media.id);

        if (existing) continue;

        const episodes: { duration: string; number: number; intro?: number[]; outro?: number[] }[] = Object.entries(data)[i][1] as any;
        const result: { duration: string; number: number; intro: { start: number; end: number }; outro: { start: number; end: number } }[] = [];

        for (let j = 0; j < episodes.length; j++) {
            if (episodes[j].intro && episodes[j].outro) {
                result.push({
                    duration: episodes[j].duration,
                    number: episodes[j].number,
                    intro: {
                        start: episodes[j].intro?.[0] ?? 0,
                        end: episodes[j].intro?.[1] ?? 0,
                    },
                    outro: {
                        start: episodes[j].outro?.[0] ?? 0,
                        end: episodes[j].outro?.[1] ?? 0,
                    },
                });
            } else if (episodes[j].intro) {
                result.push({
                    duration: episodes[j].duration,
                    number: episodes[j].number,
                    intro: {
                        start: episodes[j].intro?.[0] ?? 0,
                        end: episodes[j].intro?.[1] ?? 0,
                    },
                    outro: {
                        start: 0,
                        end: 0,
                    },
                });
            } else if (episodes[j].outro) {
                result.push({
                    duration: episodes[j].duration,
                    number: episodes[j].number,
                    intro: {
                        start: 0,
                        end: 0,
                    },
                    outro: {
                        start: episodes[j].intro?.[0] ?? 0,
                        end: episodes[j].intro?.[1] ?? 0,
                    },
                });
            }
        }

        await Database.updateSkipTimes(media.id, result);

        console.log(`Inserted skip times for ${media.title.romaji} (${media.id})`);
    }

    return "Done";
}
