import colors from "colors";
import { EPub, Chapter as EPubChapter } from "epub-gen-memory";
import { mangaProviders } from "../../mappings";
import { load } from "cheerio";
import { join } from "node:path";
import { Chapter, Manga, UploadStatus } from "../../types/types";
import { existsSync, mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { env } from "../../env";
import { get } from "../../database/impl/fetch/get";
import emitter, { Events } from "..";
import { update } from "../../database/impl/modify/update";
import { MediaStatus } from "../../types/enums";

export const loadEpub = async (data: { id: string; providerId: string; chapters: Chapter[] }) => {
    const useMixdrop = env.USE_MIXDROP;
    if (!useMixdrop) return;

    const mixdropEmail = env.MIXDROP_EMAIL;
    const mixdropKey = env.MIXDROP_KEY;

    if (!mixdropEmail || !mixdropKey) return;

    const manga = await get(data.id);
    if (!manga) return await emitter.emitAsync(Events.COMPLETED_NOVEL_UPLOAD, "");

    const chapters = (manga as Manga).chapters;
    const mixdrop = chapters.data.find((x) => x.providerId === data.providerId)?.chapters.find((x) => x.mixdrop)?.mixdrop;

    // Check if the file is removed
    const isRemoved = await checkIsDeleted(mixdropEmail ?? "", mixdropKey ?? "", mixdrop ?? "");
    if (!isRemoved && mixdrop != undefined) {
        const updatedAt = (manga as Manga).chapters.latest.updatedAt;

        if (updatedAt && updatedAt != 0) {
            // Check if updatedAt is less than 7 days
            const now = Date.now();
            const diff = now - updatedAt;
            const days = Math.floor(diff / 1000 / 60 / 60 / 24);

            if (days <= 3 || manga.status === MediaStatus.FINISHED) return mixdrop;
        }
    }

    const pdfPath = await createNovelPDF(manga as Manga, data.providerId, data.chapters);
    const file = Bun.file(pdfPath);
    if (!file.exists()) return await emitter.emitAsync(Events.COMPLETED_NOVEL_UPLOAD, "");

    const form = new FormData();
    form.append("email", mixdropEmail);
    form.append("key", mixdropKey);
    form.append("file", file);

    console.log(colors.green("Uploading ") + colors.blue(manga.title.english ?? manga.title.romaji ?? manga.title.native ?? "") + colors.green(" to Mixdrop..."));

    const result = (await (
        await fetch("https://ul.mixdrop.ag/api", {
            method: "POST",
            body: form as any,
        })
    ).json()) as { success: boolean; result?: { fileref: string } };

    if (result.success) {
        for (const chap of chapters.data) {
            if (chap.providerId === data.providerId) {
                const chaps = chap.chapters;
                for (const ch of chaps) {
                    Object.assign(ch, { mixdrop: result.result?.fileref });
                }
            }
        }

        Object.assign(manga, { chapters });
        await update(manga);

        const maxThreshold = 100;
        let threshold = 0;

        const interval = setInterval(async () => {
            const isComplete = await checkRemoteStatus(result.result?.fileref ?? "");
            const key = Object.keys(isComplete.result)[0];

            if (isComplete.result[key].status === "OK") {
                console.log(colors.green("Completed uploading novel ") + colors.blue(manga.title.english ?? manga.title.romaji ?? manga.title.native ?? "") + colors.green(" to Mixdrop"));
                try {
                    unlinkSync(pdfPath);
                    // Try to delete parent folders
                    const parentFolder = pdfPath.split("/").slice(0, -1).join("/");
                    if (readdirSync(parentFolder).length === 0) {
                        unlinkSync(parentFolder);
                        const parentParentFolder = parentFolder.split("/").slice(0, -1).join("/");
                        if (readdirSync(parentParentFolder).length === 0) {
                            unlinkSync(parentParentFolder);
                        }
                    }
                } catch (e) {
                    //
                }

                clearInterval(interval);
                return;
            } else {
                if (threshold >= maxThreshold + 5) {
                    console.error(colors.red("ERROR: ") + colors.blue(`Mixdrop upload for ${manga.title.english ?? manga.title.romaji ?? manga.title.native ?? ""} is taking too long.`));
                    try {
                        unlinkSync(pdfPath);
                        // Try to delete parent folders
                        const parentFolder = pdfPath.split("/").slice(0, -1).join("/");
                        if (readdirSync(parentFolder).length === 0) {
                            unlinkSync(parentFolder);
                            const parentParentFolder = parentFolder.split("/").slice(0, -1).join("/");
                            if (readdirSync(parentParentFolder).length === 0) {
                                unlinkSync(parentParentFolder);
                            }
                        }
                    } catch (e) {
                        //
                    }

                    clearInterval(interval);
                    return;
                }
                threshold++;
            }
        }, 1000);

        await emitter.emitAsync(Events.COMPLETED_NOVEL_UPLOAD, result.result?.fileref);
        return pdfPath;
    } else {
        console.error(colors.red("Failed to upload epub to Mixdrop."));
        return await emitter.emitAsync(Events.COMPLETED_NOVEL_UPLOAD, "");
    }
};

export const createNovelPDF = async (manga: Manga, providerId: string, chapters: Chapter[]): Promise<string> => {
    const content: EPubChapter[] = [];
    const imageFiles: { [key: string]: ArrayBuffer } = {};

    console.log(colors.green("Generating EPUB for ") + colors.blue(manga.title.english ?? manga.title.romaji ?? manga.title.native ?? "") + colors.green("..."));

    let img_id = 0;

    if (chapters.length === 0) console.log(colors.red("No chapters found for ") + colors.blue(manga.title.english ?? manga.title.romaji ?? manga.title.native ?? ""));

    const path = join(import.meta.dir, `../manga/${providerId}/${(manga.title.english ?? manga.title.romaji ?? manga.title.native ?? "").replace(/[^\w\d .-]/gi, "_").replace(/ /g, "_")}`.slice(0, -1));

    if (existsSync(`${path}/${(manga.title.english ?? manga.title.romaji ?? manga.title.native ?? "").replace(/[^\w\d .-]/gi, "_").replace(/ /g, "_")}.epub`))
        return `${path}/${(manga.title.english ?? manga.title.romaji ?? manga.title.native ?? "").replace(/[^\w\d .-]/gi, "_").replace(/ /g, "_")}.epub`;

    if (!existsSync(path)) {
        mkdirSync(path, { recursive: true });
    }

    const cover = manga.coverImage ? await fetch(manga.coverImage) : null;
    if (cover && cover.ok) {
        await Bun.write(`${path}/cover.jpg`, await cover.arrayBuffer());
    }

    const aniListId = manga.mappings.find((x) => x.providerId === "anilist")?.id;
    const kitsuId = manga.mappings.find((x) => x.providerId === "kitsu")?.id;
    const malId = manga.mappings.find((x) => x.providerId === "myanimelist")?.id;
    const novelUpdatesId = manga.mappings.find((x) => x.providerId === "novelupdates")?.id;

    content.push({
        title: manga.title.english ?? manga.title.romaji ?? manga.title.native ?? "",
        content: `
            <img src="file://${`${path}/cover.jpg`}">
            <p>${manga.description ?? ""}</p>
            <br />
            <ul>
                <li><b>Author:</b> ${manga.author ?? "Unknown"}</li>
                <li><b>Publisher:</b> ${manga.publisher ?? "Unknown"}</li>
                <li><b>Total Volumes:</b> ${manga.totalVolumes ?? "N/A"}</li>
                <li><b>Total Chapters:</b> ${manga.totalChapters ?? "N/A"}</li>
                <li><b>Year Released:</b> ${manga.year ?? "N/A"}</li>
                <li><b>Genres:</b> ${manga.genres.join(", ")}</li>
                <li><b>Country:</b> ${manga.countryOfOrigin ?? "Unknown"}</li>
                <li><b>Status:</b> ${manga.status}</li>
            </ul>
            <br />
            <h4><b>Alternative Titles:</b></h4>
            <ul>
                <li><b>English:</b> ${manga.title.english ?? "N/A"}</li>
                <li><b>Japanese:</b> ${manga.title.native ?? "N/A"}</li>
                <li><b>Romaji:</b> ${manga.title.romaji ?? "N/A"}</li>
                <li><b>Synonyms</b>: ${manga.synonyms.join(", ")}</li>
            </ul>
            <br />
            <h4><b>Links:</b></h4>
            <ul>
                ${aniListId ? `<li><b>AniList:</b> <a href="https://anilist.co/manga/${aniListId}">https://anilist.co/manga/${aniListId}</a></li>` : `<li><b>AniList:</b> <a href="https://anilist.co">No AniList ID found</a></li>`}
                ${kitsuId ? `<li><b>Kitsu:</b> <a href="https://kitsu.io/manga/${kitsuId}">https://kitsu.io/manga/${kitsuId}</a></li>` : `<li><b>Kitsu:</b> <a href="https://kitsu.io">No Kitsu ID found</a></li>`}
                ${malId ? `<li><b>MyAnimeList:</b> <a href="https://myanimelist.net/manga/${malId}">https://myanimelist.net/manga/${malId}</a></li>` : `<li><b>MyAnimeList:</b> <a href="https://myanimelist.net">No MyAnimeList ID found</a></li>`}
                ${novelUpdatesId ? `<li><b>NovelUpdates:</b> <a href="https://www.novelupdates.com/series/${novelUpdatesId}">https://www.novelupdates.com/series/${novelUpdatesId}</a></li>` : `<li><b>NovelUpdates:</b> <a href="https://www.novelupdates.com">No NovelUpdates ID found</a></li>`}
            </ul>
        `,
    });

    for (const i in chapters) {
        const html = await mangaProviders[providerId].fetchPages(chapters[i].id);
        if (!html || typeof html != "string") continue;

        const $ = load(html);

        const images = $("img");

        for (let j = 0; j < images.toArray().length; j++) {
            try {
                const imgName = `image_${img_id}.jpg`;

                const img_resp = await fetch(images.toArray()[j].attribs.src);
                if (img_resp.ok) {
                    // Generate a unique image ID
                    imageFiles[imgName] = await img_resp.arrayBuffer(); // Store image data
                    await Bun.write(`${path}/${imgName}`, imageFiles[imgName]);

                    const newSource = `file://${`${path}/${imgName}`}`;

                    $(images.toArray()[j]).replaceWith(`<img src="${newSource}">`);

                    console.log(colors.green("Added image ") + colors.blue(img_id.toString()) + colors.green(` to ${manga.title.english ?? manga.title.romaji ?? manga.title.native}.`));
                    img_id++;
                } else {
                    console.log(colors.red("Failed to fetch image ") + colors.blue(img_id.toString()) + colors.red(` from ${manga.title.english ?? manga.title.romaji ?? manga.title.native}.`));
                }
            } catch (err) {
                console.log(err);
            }
        }

        const fixed_html = $.html().replace(/{{{/g, "<%=").replace(/}}}/g, "%>");

        console.log(colors.green("Added chapter ") + colors.blue(chapters[i].title) + colors.green(` to ${manga.title.english ?? manga.title.romaji ?? manga.title.native}.`));

        content.push({
            title: chapters[i].title,
            content: fixed_html,
        });
    }

    content.push({
        title: "Credits",
        content: `
            <p>Generated by <a href="https://anify.tv">Anify</a>.</p>
            <br />
            <p>Thanks for using Anify!</p>
        `,
    });

    const book = await new EPub(
        {
            title: manga.title.english ?? manga.title.romaji ?? manga.title.native ?? "",
            cover: `file://${`${path}/cover.jpg`}`,
            lang: "en",
            date: new Date(Date.now()).toDateString(),
            description: manga.description ?? "",
            author: providerId,
            ignoreFailedDownloads: true,
        },
        content,
    ).genEpub();

    await Bun.write(`${path}/${(manga.title.english ?? manga.title.romaji ?? manga.title.native ?? "").replace(/[^\w\d .-]/gi, "_").replace(/ /g, "_")}.epub`, book);

    // Remove all images
    const images = readdirSync(path).filter((file) => file.endsWith(".jpg"));
    for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const imgPath = `${path}/${file}`;
        if (existsSync(imgPath)) {
            try {
                unlinkSync(imgPath);
            } catch (e) {
                console.log(colors.red("Unable to delete file ") + colors.blue(file + ".jpg") + colors.red("."));
            }
        }
    }

    return `${path}/${(manga.title.english ?? manga.title.romaji ?? manga.title.native ?? "").replace(/[^\w\d .-]/gi, "_").replace(/ /g, "_")}.epub`;
};

const checkRemoteStatus = async (mixdrop: string): Promise<UploadStatus> => {
    const mixdropEmail = env.MIXDROP_EMAIL;
    const mixdropKey = env.MIXDROP_KEY;

    const res = (await (await fetch(`https://api.mixdrop.ag/fileinfo2?email=${mixdropEmail}&key=${mixdropKey}&ref[]=${mixdrop}`)).json()) as UploadStatus;
    return res;
};

const checkIsDeleted = async (email: string, key: string, fileRef: string): Promise<boolean> => {
    let pages = 1;
    const initial = (await (await fetch(`https://api.mixdrop.ag/removed?email=${email}&key=${key}&page=1`)).json()) as { result: { fileref: string }[]; pages: number };
    if (!Array.isArray(initial.result)) return false;

    for (const file of initial.result) {
        if (file.fileref === fileRef) return true;
    }

    pages = initial.pages;

    for (let i = 2; i <= pages; i++) {
        const initial = (await (await fetch(`https://api.mixdrop.ag/removed?email=${email}&key=${key}&page=${i}`)).json()) as { result: { fileref: string }[]; pages: number };
        for (const file of initial.result) {
            if (file.fileref === fileRef) return true;
        }
    }

    return false;
};
