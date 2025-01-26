import { db } from "../../../../../database";
import { MangaRepository } from "../../../../../database/impl/wrapper/impl/manga";
import type { IManga } from "../../../../../types/impl/database/impl/schema/manga";
import type { IEpubCredentials } from "../../../../../types/impl/lib/impl/epub";
import { unlink, readdir, rm } from "node:fs/promises";
import colors from "colors";
import { emitter } from "../../../../../events";
import { Events } from "../../../../../types/impl/events";
import { checkRemoteStatus } from "./checkRemoteStatus";

interface MixdropResponse {
    success: boolean;
    result?: {
        fileref: string;
        [key: string]: unknown;
    };
}

const UPLOAD_TIMEOUT = 100; // Maximum number of retries
const POLLING_INTERVAL = 1000; // 1 second

async function cleanupFiles(epubPath: string): Promise<void> {
    try {
        await unlink(epubPath);

        // Cleanup parent directories if empty
        const parentDir = epubPath.split("/").slice(0, -1).join("/");
        const parentParentDir = parentDir.split("/").slice(0, -1).join("/");

        for (const dir of [parentDir, parentParentDir]) {
            try {
                const files = await readdir(dir);
                if (files.length === 0) {
                    await rm(dir, { recursive: true });
                }
            } catch (err) {
                console.error(colors.yellow(`Warning: Could not cleanup directory ${dir}`), err);
            }
        }
    } catch (err) {
        console.error(colors.yellow("Warning: File cleanup failed"), err);
    }
}

async function waitForUploadCompletion(credentials: IEpubCredentials, fileref: string, manga: IManga): Promise<boolean> {
    let attempts = 0;

    while (attempts < UPLOAD_TIMEOUT) {
        const status = await checkRemoteStatus(credentials, fileref);
        const key = Object.keys(status.result)[0];

        if (status.result[key].status === "OK") {
            console.log(colors.green("Completed uploading novel ") + colors.blue(manga.title?.english ?? manga.title?.romaji ?? manga.title?.native ?? "") + colors.green(" to Mixdrop"));
            return true;
        }

        attempts++;
        await new Promise((resolve) => setTimeout(resolve, POLLING_INTERVAL));
    }

    console.error(colors.red("ERROR: ") + colors.blue(`Mixdrop upload for ${manga.title?.english ?? manga.title?.romaji ?? manga.title?.native ?? ""} timed out.`));
    return false;
}

export const uploadEpub = async (epub: string, credentials: IEpubCredentials, manga: IManga): Promise<boolean> => {
    const file = Bun.file(epub);
    if (!file.exists()) {
        await emitter.emitAsync(Events.COMPLETED_NOVEL_UPLOAD, "");
        return false;
    }

    try {
        const form = new FormData();
        form.append("email", credentials.email);
        form.append("key", credentials.key);
        form.append("file", file);

        const response = await fetch("https://ul.mixdrop.ag/api", {
            method: "POST",
            body: form,
        });

        const result = (await response.json()) as MixdropResponse;

        if (!result.success || !result.result?.fileref) {
            console.error(colors.red("Failed to upload epub to Mixdrop:"), result);
            await emitter.emitAsync(Events.COMPLETED_NOVEL_UPLOAD, false);
            return false;
        }

        // Update manga with mixdrop fileref
        const updatedChapters = manga.chapters.data.map((chap) => ({
            ...chap,
            mixdrop: result.result?.fileref,
        }));
        await MangaRepository.updatePartially(db, manga.id, {
            chapters: { ...manga.chapters, data: updatedChapters },
        });

        const uploadSuccess = await waitForUploadCompletion(credentials, result.result.fileref, manga);
        await cleanupFiles(epub);

        await emitter.emitAsync(Events.COMPLETED_NOVEL_UPLOAD, uploadSuccess ? result.result.fileref : false);
        return uploadSuccess;
    } catch (error) {
        console.error(colors.red("Upload failed with error:"), error);
        await cleanupFiles(epub);
        await emitter.emitAsync(Events.COMPLETED_NOVEL_UPLOAD, false);
        return false;
    }
};
