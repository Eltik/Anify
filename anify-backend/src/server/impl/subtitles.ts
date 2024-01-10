import { cacheTime, redis } from "..";
import { env } from "../../env";
import { createResponse } from "../lib/response";
import crypto from "crypto";
import {parse} from "@plussub/srt-vtt-parser";
import { ParsedResult } from "@plussub/srt-vtt-parser/dist/src/types";
export const handler = async (req: Request): Promise<Response> => {
    try {
        const url = new URL(req.url);
        const paths = url.pathname.split("/");
        paths.shift();
        console.log(paths);
        let encryptedUrl = paths[1] ??null;
        
        if (!encryptedUrl) {
            return createResponse(JSON.stringify({ error: "No url provided." }), 400);
        }
        if(!encryptedUrl.endsWith(".vtt")){
            return createResponse(JSON.stringify({ error: "Invalid url provided." }), 400);
        }
        encryptedUrl = encryptedUrl.replace(".vtt","");
        const decodedUrl = decodeUrl(encryptedUrl);
        const cached = await redis.get(`subtitles:${decodedUrl}`);
        if (cached) {
            return new Response(cached, {
                headers: {
                    "Content-Type": "text/vtt",
                },
            });
        }
        if (!decodedUrl) {
            return createResponse(JSON.stringify({ error: "Invalid url provided." }), 400);
        }
        const reqeust = await fetch(decodedUrl);
        if (!reqeust.ok || reqeust.headers.get("content-type") != "text/vtt") {
            return new Response(null, {
                status: 302,
                headers: {
                    Location: decodedUrl,
                },
            });
        }
        let vttData = await reqeust.text();
        var parsed = parse(vttData);
        const textToInject = env.TEXT_TO_INJECT+"\n";
        const distanceToNextInjectedText = 1000*env.DISTANCE_FROM_INJECTED_TEXT_SECONDS;
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
        vttData = buildWebVTT(parsed);
        await redis.set(`subtitles:${decodedUrl}`,vttData, "EX", env.SUBTITLES_CACHE_TIME);
        return new Response(vttData, {
            headers: {
                "Content-Type": "text/vtt",
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
        const decipher = crypto.createDecipher("aes-256-cbc", env.SECRETE_KEY);
        let decrypted = decipher.update(url, "hex", "utf-8");
        decrypted += decipher.final("utf-8");
        return decrypted;
    } catch (e) {
        return null;
    }
}
function buildWebVTT(parsedResult:ParsedResult) {
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