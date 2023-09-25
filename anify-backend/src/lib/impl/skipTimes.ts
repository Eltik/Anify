import colors from "colors";
import { Source, Time } from "../../types/types";
import emitter, { Events } from "..";
import { getSkipTimes } from "../../database/impl/skipTimes/getSkipTimes";
import { updateSkipTimes } from "../../database/impl/skipTimes/updateSkipTimes";

export const loadSkipTimes = async (data: { id: string; episode: number; toInsert?: Source }): Promise<Time | null> => {
    const existing = await getSkipTimes(data.id);

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
        toInsert?.episodes.push({
            intro: data.toInsert.intro,
            outro: data.toInsert.outro,
            number: data.episode,
        });
    }

    await updateSkipTimes({ id: data.id, episodes: toInsert.episodes });

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
