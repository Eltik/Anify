import { join } from "node:path";

export const getBannedIDs = async () => {
    const file = Bun.file(join(import.meta.dir, "./bannedIds.json"));
    if (!(await file.exists())) {
        Bun.write(join(import.meta.dir, "./bannedIds.json"), "[]");
        return [];
    }

    const bannedIds = await file.json();
    return bannedIds;
};

export const isBanned = async (id: string) => {
    const bannedIds = await getBannedIDs();
    return bannedIds.includes(id);
};

export const addBannedID = async (id: string) => {
    const bannedIds = await getBannedIDs();
    bannedIds.push(id);

    Bun.write(join(import.meta.dir, "./bannedIds.json"), JSON.stringify(bannedIds));
};

export const removeBannedID = async (id: string) => {
    const bannedIds = await getBannedIDs();
    const index = bannedIds.indexOf(id);
    if (index > -1) {
        bannedIds.splice(index, 1);
    }

    Bun.write(join(import.meta.dir, "./bannedIds.json"), JSON.stringify(bannedIds));
};
