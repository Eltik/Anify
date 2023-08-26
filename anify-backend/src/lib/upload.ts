import { join } from "path";
import emitter, { Events } from "../helper/event";
import { Chapter, Page } from "../mapping/impl/manga";
import { createReadStream, createWriteStream, existsSync, mkdirSync, readdirSync, unlinkSync } from "fs";
import colors from "colors";
import { wait } from "../helper";
import { Readable } from "stream";
import { finished } from "stream/promises";
import PDFDocument from "pdfkit";
import probe from "probe-image-size";
import FormData from "form-data";
import Database from "../database";
import { Manga, Type } from "../mapping";
import { env } from "../env";
import { readFile, unlink } from "fs/promises";

export const uploadPages = async (data: { id: string; providerId: string; chapter: Chapter; readId: string; pages: Page[] }) => {
    const useMixdrop = env.USE_MIXDROP;
    if (useMixdrop) {
        const manga = await Database.info(data.id);
        if (!manga) return await emitter.emitAsync(Events.COMPLETED_PAGE_UPLOAD, "");

        const chapters = (manga as Manga).chapters;
        const mixdrop = chapters.data.find((x) => x.providerId === data.providerId)?.chapters.find((x) => x.id === data.chapter.id)?.mixdrop;

        const mixdropEmail = env.MIXDROP_EMAIL;
        const mixdropKey = env.MIXDROP_KEY;

        // Check if the file is removed
        const isRemoved = await checkIsDeleted(mixdropEmail ?? "", mixdropKey ?? "", mixdrop ?? "");
        if (!isRemoved && mixdrop != undefined) return mixdrop;

        const result: string[] = [];

        for (const page of data.pages) {
            //const res: UploadStatus = await (await fetch(`https://api.mixdrop.co/remoteupload?email=${mixdropEmail}&key=${mixdropKey}&url=${page.url}&folder=${encodeURIComponent(`manga/${data.id}/${data.providerId}/${data.chapter.title}`)}&name=${page.index}`)).json();
            //result.push(res.result.filterRef);
        }

        const pdfPath = await createPDF(data.id, data.providerId, data.chapter, data.pages);
        await readFile(pdfPath);

        // Upload PDF
        const form = new FormData();
        form.append("email", mixdropEmail);
        form.append("key", mixdropKey);
        form.append("file", createReadStream(pdfPath), `${data.chapter.title.replace(/[^\w .-]/gi, "")}.pdf`);
        form.append("folder", `manga/${data.id}/${data.providerId}/${data.chapter.title.replace(/[^\w .-]/gi, "")}`);

        return new Promise((resolve, reject) => {
            form.submit("https://ul.mixdrop.co/api", async (err, res) => {
                if (err) {
                    console.log(err);
                    return;
                }

                res.on("data", (chunk) => {
                    try {
                        const res = JSON.parse(chunk.toString());
                        if (res.success) result.push(res.result.fileref);
                    } catch (e) {
                        console.log(e);
                    }
                });

                res.on("end", async () => {
                    // Insert into database
                    for (const chap of chapters.data) {
                        if (chap.providerId === data.providerId) {
                            const chaps = chap.chapters;
                            for (const ch of chaps) {
                                if (ch.id === data.chapter.id) {
                                    ch.mixdrop = result[0];
                                }
                            }
                        }
                    }

                    await Database.update(data.id, Type.MANGA, {
                        chapters,
                    });

                    const maxThreshold = 100;
                    let threshold = 0;

                    const interval = setInterval(async () => {
                        const isComplete = await checkRemoteStatus(result[0]);
                        const key = Object.keys(isComplete.result)[0];

                        if (isComplete.result[key].status === "OK") {
                            console.log(colors.green("Completed uploading ") + colors.blue(data.chapter.title) + colors.green(" to Mixdrop"));

                            // Cleanup
                            try {
                                await unlink(pdfPath);
                    
                                const parentFolder = join(__dirname, `./manga/${data.id}/${data.providerId}/${data.chapter.title.replace(/[^\w .-]/gi, "")}`);
                                if (existsSync(parentFolder)) {
                                    const files = readdirSync(parentFolder);
                                    if (files.length === 0) {
                                        await unlink(parentFolder);
                    
                                        const providerFolder = join(__dirname, `./manga/${data.id}/${data.providerId}`);
                                        if (existsSync(providerFolder)) {
                                            const files = readdirSync(providerFolder);
                                            if (files.length === 0) {
                                                await unlink(providerFolder);
                    
                                                const mangaFolder = join(__dirname, `./manga/${data.id}`);
                                                if (existsSync(mangaFolder)) {
                                                    const files = readdirSync(mangaFolder);
                                                    if (files.length === 0) {
                                                        await unlink(mangaFolder);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            } catch (e) {
                                //console.error(colors.red("Error during file/folder cleanup:"), e);
                            }

                            resolve(result[0]);
                            clearInterval(interval);
                            return;
                        } else {
                            if (threshold >= maxThreshold) console.warn(colors.yellow("WARNING: ") + colors.blue(`Mixdrop upload for ${data.chapter.title} is taking too long.`));
                            if (threshold >= maxThreshold + 5) {
                                console.error(colors.red("ERROR: ") + colors.blue(`Mixdrop upload for ${data.chapter.title} is taking too long.`));
                                clearInterval(interval);
                                reject();
                                return;
                            }
                            threshold++;
                        }
                    }, 1000);

                    await emitter.emitAsync(Events.COMPLETED_PAGE_UPLOAD, result[0]);
                });
            });
        });
    } else {
        return await emitter.emitAsync(Events.COMPLETED_PAGE_UPLOAD, "");
    }
};

const checkRemoteStatus = async(mixdrop: string): Promise<UploadStatus> => {
    const mixdropEmail = env.MIXDROP_EMAIL;
    const mixdropKey = env.MIXDROP_KEY;

    const res: UploadStatus = await (await fetch(`https://api.mixdrop.co/fileinfo2?email=${mixdropEmail}&key=${mixdropKey}&ref[]=${mixdrop}`)).json();
    return res;
}

export const createPDF = async (id: string, providerId: string, chapter: Chapter, pages: Page[]): Promise<string> => {
    const parentFolder = join(__dirname, `./manga/${id}/${providerId}/${chapter.title.replace(/[^\w .-]/gi, "")}`);
    if (existsSync(`${parentFolder}/${chapter.title.replace(/[^\w .-]/gi, "")}.pdf`)) return `${parentFolder}/${chapter.title.replace(/[^\w .-]/gi, "")}.pdf`;

    if (!existsSync(parentFolder)) {
        mkdirSync(parentFolder, { recursive: true });
    }

    console.log(colors.blue("Creating PDF for ") + colors.green(chapter.title));

    const promises: any[] = [];
    for (let i = 0; i < pages.length; i++) {
        const request = new Promise(async (resolve, reject) => {
            const link = pages[i].url;
            const page = pages[i].index;

            const pagePath = join(parentFolder, `/${page}.png`);

            if (link) {
                if (!existsSync(pagePath)) {
                    await wait(50);
                    await downloadFile(link, pagePath, {
                        ...pages[i].headers,
                        Connection: "keep-alive",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/89.0.4389.114 Safari/537.36",
                        "Accept-Language": "en-US,en;q=0.9",
                        "Accept-Encoding": "gzip, deflate, br",
                        Accept: "*/*",
                    });
                    resolve(true);
                } else {
                    resolve(true);
                }
            }
        });

        promises.push(request);
    }

    await Promise.all(promises);

    const doc = new PDFDocument({
        autoFirstPage: false,
    });
    const pdfStream = createWriteStream(`${parentFolder}/${chapter.title.replace(/[^\w .-]/gi, "")}.pdf`);
    doc.pipe(pdfStream);

    const images = readdirSync(parentFolder).filter((file) => file.endsWith(".png"));

    const files: (string | number)[][] = [];
    for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const a: string | number = file.split(".")[0];
        files.push([file, a ? a.toString() : ""]);
    }
    files.sort((a, b) => parseFloat(a[1].toString()) - parseFloat(b[1].toString()));

    for (let i = 0; i < files.length; i++) {
        const file = files[i][0];
        const result = await probe(createReadStream(join(parentFolder, "/" + file)));
        let width = result.width;
        let height = result.height;
        const ratio = (width + height) / 2;
        const a7Ratio = 338.266666661706;
        const scale = a7Ratio / ratio;

        width = width * scale;
        height = height * scale;

        try {
            doc.addPage({ size: [width, height] }).image(join(parentFolder, "/" + file), 0, 0, { align: "center", valign: "center", width: width, height: height });
        } catch (e) {
            console.log(colors.red("Unable to add page ") + colors.blue(file + "") + colors.red(" to PDF ") + colors.blue(id));
        }
    }
    doc.end();

    // Remove all images
    for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const path = join(parentFolder, "/" + file);
        if (existsSync(path)) {
            try {
                unlinkSync(path);
            } catch (e) {
                console.log(colors.red("Unable to delete file ") + colors.blue(file + "") + colors.red(" from ") + colors.blue(id));
            }
        }
    }

    return `${parentFolder}/${chapter.title.replace(/[^\w .-]/gi, "")}.pdf`;
};

export const checkIsDeleted = async (email: string, key: string, fileRef: string) => {
    let pages = 1;
    const initial = await (await fetch(`https://api.mixdrop.co/removed?email=${email}&key=${key}&page=1`)).json();
    if (!Array.isArray(initial.result)) return false;

    for (const file of initial.result) {
        if (file.fileref === fileRef) return true;
    }

    pages = initial.pages;

    for (let i = 2; i <= pages; i++) {
        const initial = await (await fetch(`https://api.mixdrop.co/removed?email=${email}&key=${key}&page=${i}`)).json();
        for (const file of initial.result) {
            if (file.fileref === fileRef) return true;
        }
    }

    return false;
};

async function downloadFile(file: string, path: string, headers?: any) {
    if (existsSync(path)) return;

    const response = await fetch(file, {
        headers: headers,
    });

    if (!response.ok) {
        throw new Error(`Request failed with status: ${response.status} ${response.statusText}`);
    }

    const fileStream = createWriteStream(path, { flags: "wx" });
    await finished(Readable.fromWeb(response.body as any).pipe(fileStream));
}

interface UploadStatus {
    success: true;
    result: ResultData;
}

type ResultData = {
    [key: string]: FileData;
};

type FileData = {
    fileref: string;
    title: string;
    size: string;
    duration: null;
    subtitle: boolean;
    isvideo: boolean;
    isaudio: boolean;
    added: string;
    status: string;
    deleted: boolean;
    thumb: null;
    url: string;
    yourfile: boolean;
}