import colors from "colors";
import { isString } from "../../helper";
import ChunkedExecutor from "../executor";
import { CORS_PROXIES } from "..";
import { ANIME_PROVIDERS, MANGA_PROVIDERS, META_PROVIDERS } from "../../mappings";

const toCheck: string[] = [];

export async function checkCorsProxies(): Promise<string[]> {
    const goodIps: string[] = [];
    console.log(colors.yellow("Importing proxies... Please note that reading the proxies file may take a while."));

    if (toCheck.length === 0) {
        const file = Bun.file("./proxies.json");
        if (await file.exists()) {
            // Check proxies.json
            const proxies = await file.json();
            for (let i = 0; i < proxies.length; i++) {
                const ip = proxies[i].ip;
                const port = proxies[i].port;

                const url = `http://${ip}:${port}`;
                toCheck.push(url);
            }
            console.log(colors.green(`Finished importing ${colors.yellow(toCheck.length + "")} current proxies.`));
        }
    }
    console.log(colors.yellow("Checking proxies..."));
    const ips = toCheck
        .map((proxy) => {
            try {
                const url = new URL(proxy);
                return { ip: url.hostname, port: Number(url.port) };
            } catch (e) {
                return { ip: "", port: 8080 };
            }
        })
        .filter((obj) => obj.port != 8080);

    const chunkSize = 25;
    const perChunkCallback = (chunk: IP[]) => {
        console.log(colors.gray(`Checking ${chunk.length} proxies...`));
    };

    const perResultsCallback = (result: (string | undefined)[]) => {
        const ips = result.filter(isString);
        goodIps.push(...ips);
        console.log(colors.green(`${ips.length} proxies are good!`));

        Bun.write("./goodProxies.json", JSON.stringify(goodIps, null, 4));
    };

    const executor = new ChunkedExecutor<IP, string | undefined>(ips, chunkSize, makeRequest, perChunkCallback, perResultsCallback);
    await executor.execute();

    console.log(colors.gray("Finished checking proxies."));

    CORS_PROXIES.length = 0;
    toCheck.length = 0;
    CORS_PROXIES.push(...goodIps);
    return goodIps;
}

async function makeRequest(ip: IP): Promise<string | undefined> {
    const controller = new AbortController();

    console.log(colors.gray("Checking ") + `${ip.ip}:${ip.port}` + colors.gray(".") + colors.gray(" (Timeout: 5 seconds)"));

    setTimeout(() => {
        controller.abort();
    }, 5000);

    try {
        const response = await fetch(`http://${ip.ip}:${ip.port}/iscorsneeded`, {
            signal: controller.signal,
        }).catch(
            (err) =>
                ({
                    ok: false,
                    status: 500,
                    statusText: "Timeout",
                    json: () => Promise.resolve({ error: err }),
                }) as Response,
        );
        if (response.status === 200 && (await response.text()) === "no") {
            let isOkay = true;

            console.log(colors.yellow("Testing ") + `${ip.ip}:${ip.port}` + colors.yellow("."));

            for (const provider of ANIME_PROVIDERS) {
                console.log(colors.gray("Testing ") + provider.id + colors.gray("."));

                provider.customProxy = `http://${ip.ip}:${ip.port}`;

                const providerResponse = await provider.search("Mushoku Tensei").catch(() => {
                    return undefined;
                });

                provider.customProxy = undefined;

                if (!providerResponse) {
                    console.log(colors.red(`${provider.id} failed.`));
                    isOkay = false;
                    break;
                }
            }

            if (isOkay) {
                console.log(colors.yellow("Anime providers passed."));
            } else {
                console.log(colors.red("Anime providers failed."));
                return undefined;
            }

            for (const provider of MANGA_PROVIDERS) {
                console.log(colors.gray("Testing ") + provider.id + colors.gray("."));

                provider.customProxy = `http://${ip.ip}:${ip.port}`;

                const providerResponse = await provider.search("Mushoku Tensei").catch(() => {
                    return undefined;
                });

                provider.customProxy = undefined;

                if (!providerResponse) {
                    console.log(colors.red(`${provider.id} failed.`));
                    isOkay = false;
                    break;
                }
            }

            if (isOkay) {
                console.log(colors.yellow("Manga providers passed."));
                return ip.ip + ":" + ip.port;
            } else {
                console.log(colors.red("Manga providers failed."));
                return undefined;
            }
        } else {
            console.log(colors.red(`${ip.ip}:${ip.port} is not a CORS proxy.`));
            return undefined;
        }
    } catch (error) {
        return undefined;
    }
}

interface IP {
    ip: string;
    port: number;
}
