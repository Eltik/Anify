// this is a file to view all the folders from the builds folder

import fs, { existsSync } from "fs";
import path from "path";

interface ListRepoStats extends fs.Stats {
    name: string;
}

export default function listDirectoryStats(): ListRepoStats[] {
    if (!existsSync(path.join(import.meta.dir, "..", "..", "..", "builds"))) {
        fs.mkdirSync(path.join(import.meta.dir, "..", "..", "..", "builds"), { recursive: true });
    }

    const files = fs.readdirSync(path.join(import.meta.dir, "..", "..", "..", "builds"));
    return files
        .map((file) => {
            const fileStats = fs.statSync(path.join(import.meta.dir, "..", "..", "..", "builds", file));
            return { ...fileStats, name: file };
        })
        .filter((x) => {
            return x.name !== ".gitkeep";
        })
        .sort((a, b) => {
            return b.mtimeMs - a.mtimeMs;
        });
}
