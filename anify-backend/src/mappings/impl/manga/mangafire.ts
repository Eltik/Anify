import { load } from "cheerio";
import MangaProvider from ".";
import { Format, Formats } from "../../../types/enums";
import { Chapter, Page, Result } from "../../../types/types";
import Jimp from "jimp";

export default class MangaFire extends MangaProvider {
    override rateLimit = 250;
    override id = "mangafire";
    override url = "https://mangafire.to";

    override formats: Format[] = [Format.MANGA, Format.ONE_SHOT];

    override async search(query: string, format?: Format, year?: number): Promise<Result[] | undefined> {
        const results: Result[] = [];

        // https://mangafire.to/filter?keyword=Mushoku+tensei&type%5B%5D=manga&year%5B%5D=2021&sort=recently_updated
        const data = await (await this.request(`${this.url}/filter?keyword=${encodeURIComponent(query)}${format ? `&type%5B%5D=${format.toLowerCase()}` : ""}${year && year != 0 ? `&year=%5B%5D=${year}` : ""}&sort=recently_updated`, {}, true)).text();

        const $ = load(data);

        $("main div.container div.original div.unit").map((i, el) => {
            const formatString: string = $(el).find("div.info span.type").text()?.toUpperCase();
            const format: Format = formatString === "DOUJINSHI" ? Format.MANGA : Formats.includes(formatString as Format) ? (formatString as Format) : Format.UNKNOWN;

            results.push({
                id: $(el).find("a").attr("href") ?? "",
                altTitles: [],
                format,
                img: $(el).find("img").attr("src") ?? "",
                title: $(el).find("div.info a").first()?.text()?.trim(),
                year: 0,
                providerId: this.id,
            });
        });

        return results;
    }

    override async fetchChapters(id: string): Promise<Chapter[] | undefined> {
        const chapters: Chapter[] = [];

        const pattern = /\.([^.]+)$/;
        const match = pattern.exec(id);

        const mangaId = match ? match[1] : "";

        const data = await (
            await this.request(
                `${this.url}/ajax/manga/${mangaId}/chapter/en`,
                {
                    headers: {
                        "X-Requested-With": "XMLHttpRequest",
                        Referer: `${this.url}${id}`,
                    },
                },
                true,
            )
        ).json();

        if (data.status !== 200) {
            return chapters;
        }

        const $ = load(data.result);

        $("ul li.item").map((i, el) => {
            chapters.push({
                id: $(el).find("a").attr("href") ?? "",
                number: Number($(el).attr("data-number")),
                title: $(el).find("span").first()?.text()?.trim(), // Can also be $(el).find("a").attr("title")
                updatedAt: new Date($($(el).find("span")[1])?.text()).getTime(),
            });
        });

        return chapters;
    }

    override async fetchPages(id: string): Promise<string | Page[] | undefined> {
        const pages: Page[] = [];

        const pattern = /\.([^.]+)$/;
        const match = pattern.exec(id);

        const mangaId = (match ? match[1] : "")?.split("/")[0];

        const data = await (
            await this.request(`${this.url}/ajax/read/${mangaId}/chapter/en`, {
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    Referer: `${this.url}${id}`,
                },
            })
        ).json();

        const $ = load(data.result?.html);

        let chapterId = "";
        $("ul li").map((i, el) => {
            const chapId = $(el).find("a").attr("data-id");
            const url = $(el).find("a").attr("href");
            if (url === id) {
                chapterId = chapId ?? "";
            }
        });

        if (chapterId === "") {
            return pages;
        }

        const imageData: ImageResponse = await (
            await this.request(`${this.url}/ajax/read/chapter/${chapterId}`, {
                headers: {
                    "X-Requested-With": "XMLHttpRequest",
                    Referer: `${this.url}${id}`,
                },
            })
        ).json();

        const images = imageData.result.images.map((image, index) => {
            return {
                url: image[0],
                index: index,
                isScrambled: image[2] != 0,
                scrambledKey: image[2],
            };
        });

        for (let i = 0; i < images.length; i++) {
            if (images[i].isScrambled) {
                const key = images[i].scrambledKey;
                const url = images[i].url;
                const descrambled = await this.descrambleImage(url, key, i);
                images[i].url = descrambled;
            }
            pages.push({
                url: images[i].url,
                headers: {
                    Referer: `${this.url}${id}`,
                },
                index: images[i].index,
            });
        }

        return pages;
    }

    private async descrambleImage(url: string, key: number, index: number): Promise<string> {
        return new Promise(async (resolve, reject) => {
            const s = key;
            try {
                const image = await Jimp.read(url);

                const tileWidth = Math.min(200, Math.ceil(image.getWidth() / 5));
                const tileHeight = Math.min(200, Math.ceil(image.getHeight() / 5));
                const numTilesWide = Math.ceil(image.getWidth() / tileWidth) - 1;
                const numTilesHigh = Math.ceil(image.getHeight() / tileHeight) - 1;

                const newImage = new Jimp(image.getWidth(), image.getHeight());

                for (let y = 0; y <= numTilesHigh; y++) {
                    for (let x = 0; x <= numTilesWide; x++) {
                        let tileX = x;
                        let tileY = y;

                        if (x < numTilesWide) {
                            tileX = (numTilesWide - x + s) % numTilesWide;
                        }

                        if (y < numTilesHigh) {
                            tileY = (numTilesHigh - y + s) % numTilesHigh;
                        }

                        const sx = tileX * tileWidth;
                        const sy = tileY * tileHeight;
                        const sw = Math.min(tileWidth, image.getWidth() - x * tileWidth);
                        const sh = Math.min(tileHeight, image.getHeight() - y * tileHeight);
                        const dx = x * tileWidth;
                        const dy = y * tileHeight;

                        const tile = image.clone().crop(sx, sy, sw, sh);
                        newImage.blit(tile, dx, dy);
                    }
                }

                const base64Data = await newImage.getBase64Async(Jimp.MIME_PNG);
                resolve(base64Data);
            } catch (error) {
                reject(error);
            }
        });
    }
}

interface ImageResponse {
    status: number;
    result: {
        force_reading_mode: any;
        images: [[string, number, number]];
    };
    message: string;
    messages: string[];
}
