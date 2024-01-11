import { env } from "../../env";
import { createResponse } from "../lib/response";
import crypto from "crypto";
import { parse } from "@plussub/srt-vtt-parser";
import { Entry, ParsedResult } from "@plussub/srt-vtt-parser/dist/src/types";
import NodeCache from "node-cache";
import { AES } from "../lib/Aes";

const subtitleCache = new NodeCache({ stdTTL: env.SUBTITLES_CACHE_TIME });
export const handler = async (req: Request): Promise<Response> => {
    try {
        const url = new URL(req.url);
        const paths = url.pathname.split("/");
        paths.shift();

        let encryptedUrl = paths[1] ?? null;

        if (!encryptedUrl) {
            return createResponse(JSON.stringify({ error: "No url provided." }), 400);
        }
        if (!encryptedUrl.endsWith(".vtt")) {
            return createResponse(JSON.stringify({ error: "Invalid url provided." }), 400);
        }

        encryptedUrl = encryptedUrl.replace(".vtt", "");
        const decodedUrl = AES.Decrypt(encryptedUrl, env.SECRET_KEY);

        if (!decodedUrl) {
            return createResponse(JSON.stringify({ error: "Invalid url provided." }), 400);
        }
        const cached = subtitleCache.get<string>(decodedUrl);
        if (cached) {
            return new Response(cached, {
                headers: {
                    "Content-Type": "text/vtt",
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Max-Age": "2592000",
                    "Access-Control-Allow-Headers": "*",
                },
            });
        }

        const reqeust = await fetch(decodedUrl);
        if (!reqeust.ok || !decodedUrl.endsWith(".vtt")) {
            return new Response(null, {
                status: 302,
                headers: {
                    Location: decodedUrl,
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                    "Access-Control-Max-Age": "2592000",
                    "Access-Control-Allow-Headers": "*",
                },
            });
        }

        let vttData = await reqeust.text();

        vttData = env.USE_INLINE_SUBTITLE_SPOOFING ? parseVttInline(vttData) : parseVtt(vttData);
        subtitleCache.set(decodedUrl, vttData);
        return new Response(vttData, {
            headers: {
                "Content-Type": "text/vtt",
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
                "Access-Control-Max-Age": "2592000",
                "Access-Control-Allow-Headers": "*",
            },
        });
    } catch (e) {
        console.error(e);
        return createResponse(JSON.stringify({ error: "An error occurred." }), 500);
    }
};

const route = {
    method: "GET",
    path: "/subtitles",
    handler,
    rateLimit: 60,
};

export default route;

function decodeUrl(url: string) {
    try {
        const decipher = crypto.createDecipher("aes-256-cbc", env.SECRET_KEY);
        let decrypted = decipher.update(url, "hex", "utf-8");
        decrypted += decipher.final("utf-8");
        return decrypted;
    } catch (e) {
        return null;
    }
}

function buildWebVTT(parsedResult: ParsedResult) {
    let webVTTContent = "WEBVTT\n\n";

    for (const entry of parsedResult.entries) {
        const startTime = formatTime(entry.from);
        const endTime = formatTime(entry.to);

        webVTTContent += `${startTime} --> ${endTime}\n${entry.text}\n\n`;
    }

    return webVTTContent;
}

function formatTime(milliseconds: number) {
    const date = new Date(0);
    date.setUTCMilliseconds(milliseconds);

    const hours = date.getUTCHours().toString().padStart(2, "0");
    const minutes = date.getUTCMinutes().toString().padStart(2, "0");
    const seconds = date.getUTCSeconds().toString().padStart(2, "0");
    const millisecondsStr = date.getUTCMilliseconds().toString().padStart(3, "0");

    return `${hours}:${minutes}:${seconds}.${millisecondsStr}`;
}
function parseVttInline(vttData: string): string {
    var parsed = parse(vttData);
    const textToInject = env.TEXT_TO_INJECT + "\n";
    const distanceToNextInjectedText = 1000 * env.DISTANCE_FROM_INJECTED_TEXT_SECONDS;
    var nextModifyTimeMs = 0;
    var hasSetFirstEntry = false;
    parsed.entries.forEach((entry) => {
        if (!hasSetFirstEntry) {
            entry.text = textToInject + entry.text;
            nextModifyTimeMs = entry.to + distanceToNextInjectedText;
            hasSetFirstEntry = true;
        }

        if (entry.to > nextModifyTimeMs) {
            entry.text = textToInject + entry.text;
            nextModifyTimeMs = entry.to + distanceToNextInjectedText;
        }
    });
    return buildWebVTT(parsed);
}

function parseVtt(vttData: string): string {
    var parsed = parse(vttData);

    const timeBetweenAds = 1000 * env.DISTANCE_FROM_INJECTED_TEXT_SECONDS; //eg 5 minutes
    const displayDuration = 1000 * env.DURATION_FOR_INJECTED_TEXT_SECONDS; //eg 5 seconds

    const lastEntry = parsed.entries[parsed.entries.length - 1];
    const firstStartTime = 0;
    let lastEndTime = lastEntry.to;
    const totalDuration = lastEndTime - firstStartTime;

    const numberOfAds = Math.floor(totalDuration / timeBetweenAds);
    //inject ads into entries
    const adEntries: Entry[] = [];
    for (let i = 0; i < numberOfAds; i++) {
        const adEntry: Entry = {
            id: "ad",
            from: firstStartTime + i * timeBetweenAds,
            to: firstStartTime + i * timeBetweenAds + displayDuration,
            text: env.TEXT_TO_INJECT,
        };
        adEntries.push(adEntry);
    }
    //combine entries
    parsed.entries = parsed.entries.concat(adEntries);
    //sort entries
    parsed.entries.sort((a, b) => {
        return a.from - b.from;
    });
    //build vtt
    return buildWebVTT(parsed);
}
