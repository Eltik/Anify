import colors from "colors";
import { CORS_PROXIES } from "..";
import { ANIME_PROVIDERS, BASE_PROVIDERS, MANGA_PROVIDERS } from "../../mappings";
import { Format, Type } from "../../types/enums";

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

    for (const ip of ips) {
        const result = await makeRequest(ip);
        if (result) goodIps.push(result) && console.log(colors.green(result + " passed!"));
        else console.log(colors.red(`${ip.ip}:${ip.port} failed.`));

        Bun.write("./goodProxies.json", JSON.stringify(goodIps, null, 4));
    }

    console.log(colors.gray("Finished checking proxies."));

    CORS_PROXIES.length = 0;
    toCheck.length = 0;
    CORS_PROXIES.push(...goodIps);
    return goodIps;
}

async function makeRequest(ip: IP): Promise<string | undefined> {
    return new Promise(async (resolve, reject) => {
        const controller = new AbortController();

        console.log(colors.gray("Checking ") + `${ip.ip}:${ip.port}` + colors.gray(".") + colors.gray(" (Timeout: 5 seconds)"));

        setTimeout(() => {
            controller.abort();
        }, 5000);

        controller.signal.addEventListener("abort", () => {
            console.log(colors.red(`http://${ip.ip}:${ip.port} aborted.`));

            return resolve(undefined);
        });

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
                console.log(colors.green(`http://${ip.ip}:${ip.port} is a CORS proxy.`));

                // Check all providers
                let isOkay = true;
                for (const provider of BASE_PROVIDERS) {
                    console.log(colors.gray("Testing ") + provider.id + colors.gray("."));

                    provider.customProxy = `http://${ip.ip}:${ip.port}`;

                    const providerResponse = await provider.search("Mushoku Tensei", provider.formats.includes(Format.TV) ? Type.ANIME : Type.MANGA, provider.formats, 0, 10).catch(() => {
                        return undefined;
                    });

                    provider.customProxy = undefined;

                    if (!providerResponse) {
                        console.log(colors.red(`${provider.id} failed.`));
                        isOkay = false;
                        break;
                    }
                }

                if (isOkay) console.log(colors.yellow("Base providers passed."));
                else return undefined;

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

                if (isOkay) console.log(colors.yellow("Anime providers passed."));

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

                if (isOkay) console.log(colors.yellow("Manga providers passed."));
                else return undefined;

                return resolve(ip.ip + ":" + ip.port);
            } else {
                console.log(colors.red(`${ip.ip}:${ip.port} is not a CORS proxy.`));
                return resolve(undefined);
            }
        } catch (error) {
            return resolve(undefined);
        }
    });
}

interface IP {
    ip: string;
    port: number;
}
