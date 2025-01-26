import type { IChapter } from "../../../../../../types";
import type { IManga } from "../../../../../../types/impl/database/impl/schema/manga";
import type { ImageFile } from "../../../../../../types/impl/lib/impl/epub";
import type { Chapter as EPubChapter } from "epub-gen-memory";
import { MANGA_PROVIDERS } from "../../../../../../mappings";
import { type CheerioAPI, load } from "cheerio";
import colors from "colors";
import { env } from "../../../../../../env";
import { getMediaTitle } from "./utils";

export const processChapter = async (chapter: IChapter, providerId: string, dir: string, imageFiles: ImageFile, currentImageId: number, media: IManga): Promise<(EPubChapter & { imageId: number }) | null> => {
    const provider = (await Promise.all(MANGA_PROVIDERS.map((factory) => factory()))).find((p) => p.id === providerId);
    if (!provider) return null;

    const html = await provider.fetchPages(chapter.id, true, chapter);
    if (!html || typeof html !== "string") return null;

    const $ = load(html);
    const { processedHtml, newImageId } = await processImages($, dir, imageFiles, currentImageId, media);

    if (env.DEBUG) {
        console.log(colors.green("Added chapter ") + colors.blue(chapter.title) + colors.green(` to ${getMediaTitle(media)}.`));
    }

    return {
        title: chapter.title,
        content: processedHtml.replace(/{{{/g, "<%=").replace(/}}}/g, "%>"),
        imageId: newImageId,
    };
};

export const processImages = async ($: CheerioAPI, dir: string, imageFiles: ImageFile, startImageId: number, media: IManga) => {
    let currentImageId = startImageId;
    const images = $("img");

    for (const image of images.toArray()) {
        try {
            const imgName = `image_${currentImageId}.jpg`;
            const imgResponse = await fetch(image.attribs.src);

            if (imgResponse.ok) {
                imageFiles[imgName] = await imgResponse.arrayBuffer();
                await Bun.write(`${dir}/${imgName}`, imageFiles[imgName]);

                const newSource = `file://${`${dir}/${imgName}`}`;
                $(image).replaceWith(`<img src="${newSource}">`);

                console.log(colors.green("Added image ") + colors.blue(currentImageId.toString()) + colors.green(` to ${getMediaTitle(media)}.`));
                currentImageId++;
            } else {
                console.log(colors.red("Failed to fetch image ") + colors.blue(currentImageId.toString()) + colors.red(` from ${getMediaTitle(media)}.`));
            }
        } catch (err) {
            console.log(err);
        }
    }

    return { processedHtml: $.html(), newImageId: currentImageId };
};
