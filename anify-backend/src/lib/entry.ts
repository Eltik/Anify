import emitter, { Events } from "../helper/event";
import { Anime, Format, Manga, Season, Type } from "../mapping";
import colors from "colors";
import Database from "../database";

export const createEntry = async (data: { toInsert: Anime | Manga; type: Type }) => {
    const existing = await Database.info(String(data.toInsert.id));

    if (existing) {
        await emitter.emitAsync(Events.COMPLETED_ENTRY_CREATION, data.toInsert);
        return existing;
    }

    if (data.type === Type.ANIME) {
        if (Array.isArray((data.toInsert as any).season)) {
            console.log(colors.yellow("Fixed season for anime."));
            (data.toInsert as any).season = (data.toInsert as any).season[0];
        }
    }

    (data.toInsert as any).id = String(data.toInsert.id);

    await Database.createEntry(data.type === Type.ANIME ? (data.toInsert as Anime) : (data.toInsert as Manga));

    await emitter.emitAsync(Events.COMPLETED_ENTRY_CREATION, data.toInsert);

    return data.toInsert;
};

export const returnCreatedEntry = (data: Anime | Manga) => {
    if (data.type === Type.ANIME) {
        if (Array.isArray((data as any).season)) {
            console.log(colors.yellow("Fixed season for anime."));
            (data as any).season = (data as any).season[0];
        }
    }

    (data as any).id = String(data.id);

    if (data.type === Type.ANIME) {
        return data as Anime;
    } else {
        return data as Manga;
    }
};
