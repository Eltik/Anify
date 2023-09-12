import { get } from "../../database/impl/modify/get";
import { Type } from "../../types/enums";
import { Anime, Manga } from "../../types/types";
import emitter, { Events } from "..";
import { create } from "../../database/impl/modify/create";

export const createEntry = async (data: { toInsert: Anime | Manga; type: Type }) => {
    const existing = await get(String(data.toInsert.id));

    if (existing) {
        await emitter.emitAsync(Events.COMPLETED_ENTRY_CREATION, data.toInsert);
        return existing;
    }

    if (data.type === Type.ANIME) {
        if (Array.isArray((data.toInsert as any).season)) {
            (data.toInsert as any).season = String((data.toInsert as any).season[0]?.trim());
        }
    }

    (data.toInsert as any).id = String(data.toInsert.id);

    await create(data.toInsert);

    await emitter.emitAsync(Events.COMPLETED_ENTRY_CREATION, data.toInsert);

    return data.toInsert;
};
