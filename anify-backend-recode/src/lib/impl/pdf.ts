import { Chapter, Page } from "../../types/types";
import { wait } from "../../helper";

import PDFDocument from "pdfkit";
import { existsSync, mkdirSync, createWriteStream, readdirSync, unlinkSync } from "node:fs";
import colors from "colors";

import { pipeline } from "node:stream";
import { promisify } from "node:util";
import imageSize from "image-size";

export const createPDF = async (providerId: string, chapter: Chapter, pages: string | Page[]): Promise<string> => {
    if (typeof pages === "string") {
        return await createNovelPDF(providerId, chapter, pages);
    }
    return await createMangaPDF(providerId, chapter, pages);
};

export const createNovelPDF = async (providerId: string, chapter: Chapter, pages: string): Promise<string> => {
    return "";
};

export const createMangaPDF = async (providerId: string, chapter: Chapter, pages: Page[]): Promise<string> => {
    const parentFolder = `./manga/${providerId}/${chapter.title.replace(/[^\w .-]/gi, "")}`;
    const chapterTitle = chapter.title.replace(/[^\w .-]/gi, "");

    if (await Bun.file(`${parentFolder}/${chapterTitle}.pdf`).exists()) return `${parentFolder}/${chapterTitle}.pdf`;

    if (!existsSync(parentFolder)) {
        mkdirSync(parentFolder, { recursive: true });
    }

    console.log(colors.blue("Creating PDF for ") + colors.green(chapter.title));

    const promises: any[] = [];
    for (let i = 0; i < pages.length; i++) {
        const request = new Promise(async (resolve, reject) => {
            const link = pages[i].url;
            const page = pages[i].index;

            const pagePath = `${parentFolder}/${page}.png`;

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

        const result = await getImageSize(`${parentFolder}/${file}`).catch((e) => {
            return null;
        });
        if (!result) {
            continue;
        }

        let width = result.width ?? 0;
        let height = result.height ?? 0;
        const ratio = (width + height) / 2;
        const a7Ratio = 338.266666661706;
        const scale = a7Ratio / ratio;

        width = width * scale;
        height = height * scale;

        try {
            doc.addPage({ size: [width, height] }).image(`${parentFolder}/${file}`, 0, 0, { align: "center", valign: "center", width: width, height: height });
        } catch (e) {
            console.log(colors.red("Unable to add page ") + colors.blue(file + "") + colors.red(" to PDF."));
        }
    }
    doc.end();

    // Remove all images
    for (let i = 0; i < images.length; i++) {
        const file = images[i];
        const path = `${parentFolder}/${file}`;
        if (existsSync(path)) {
            try {
                unlinkSync(path);
            } catch (e) {
                console.log(colors.red("Unable to delete file ") + colors.blue(file + ".png") + colors.red("."));
            }
        }
    }

    return `${parentFolder}/${chapter.title.replace(/[^\w .-]/gi, "")}.pdf`;
};

/**
 * Downloads a file from the given URL and saves it to the specified local path.
 * @param url The URL of the file to download.
 * @param outputPath The local path where the file will be saved.
 * @param headers (Optional) Headers to be included in the HTTP request.
 * @returns A Promise that resolves when the download is complete.
 */

async function downloadFile(url: string, outputPath: string, headers?: Record<string, string>): Promise<void> {
    try {
        const response = await fetch(url, { headers });

        if (!response.ok) {
            throw new Error(`Failed to download file from ${url}: ${response.statusText}`);
        }

        const pipelineAsync = promisify(pipeline);

        const writer = createWriteStream(outputPath) as NodeJS.WritableStream;

        const finishPromise = new Promise<void>((resolve, reject) => {
            writer.on("finish", () => resolve());
            writer.on("error", (err) => reject(err));
        });

        await pipelineAsync(response.body!, writer);

        await finishPromise;

        return;
    } catch (error) {
        throw new Error(`Failed to download file from ${url}.`);
    }
}

async function getImageSize(path: string): Promise<{ width: number; height: number } | null> {
    try {
        const file = Bun.file(path);
        if (!file) return null;

        // Convert the Uint8Array to a Buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Use image-size to get the image dimensions
        const dimensions = imageSize(buffer);

        if (dimensions.width && dimensions.height) {
            return { width: dimensions.width, height: dimensions.height };
        } else {
            return null; // Failed to get image dimensions
        }
    } catch (e) {
        return null;
    }
}
