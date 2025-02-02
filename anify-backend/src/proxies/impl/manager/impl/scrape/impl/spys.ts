import { load } from "cheerio";
import type { IProxy } from "../../../../../../types/impl/proxies";
import { ProxyType } from "../../../../../../types/impl/proxies";

const scrape = async (): Promise<IProxy[]> => {
    const data = await (await fetch("https://spys.one/en/socks-proxy-list/")).text();
    const $ = load(data);

    // Extract the script that contains port number variables
    const varScript =
        $("script")
            .filter((i, el) => {
                const content = $(el).html() || "";
                return content.includes("^") && content.includes("=");
            })
            .first()
            .html() ?? "";

    // First pass: Parse direct number assignments
    const variables: { [key: string]: number } = {};
    varScript.split(";").forEach((line) => {
        const match = line.match(/([a-z][0-9a-z]+)=(\d+)(?!\^)/);
        if (match) {
            variables[match[1]] = parseInt(match[2]);
        }
    });

    // Second pass: Parse XOR definitions
    varScript.split(";").forEach((line) => {
        const match = line.match(/([a-z][0-9a-z]+)=(\d+)\^([a-z][0-9a-z]+)/);
        if (match && variables[match[3]] !== undefined) {
            variables[match[1]] = parseInt(match[2]) ^ variables[match[3]];
        }
    });

    const proxyList = $("tr[class^='spy1']")
        .map((i, el) => {
            const cells = $(el).find("td");
            if (cells.length < 1) return null;

            // Extract IP from the first column
            const ipCell = $(cells[0]);
            const ipText = ipCell.text().trim();
            // Extract IP by taking everything before "document.write"
            const ip = ipText.split("document.write")[0].trim();
            if (!ip || ip === "Proxy address:port") return null;

            // Extract port calculation script
            const portScript = ipCell.find("script").html() ?? "";

            // Look for the entire port calculation expression
            const portCalc = portScript.match(/document\.write\(".*?"\+(.*)\)/)?.[1];
            if (!portCalc) return null;

            // Extract all XOR operations using regex
            const xorOps = Array.from(portCalc.matchAll(/\(([a-z][0-9a-z]+)\^([a-z][0-9a-z]+)\)/g));
            if (xorOps.length === 0) return null;

            // Calculate port by performing XOR operations
            let portString = "";
            for (const [, var1, var2] of xorOps) {
                if (!variables[var1] || !variables[var2]) continue;
                portString += (variables[var1] ^ variables[var2]).toString();
            }

            const port = parseInt(portString);
            if (!port || portString.length < 4) return null;

            // Extract type from the second column (SOCKS4/SOCKS5)
            const type = $(cells[1]).text().trim().toLowerCase();

            // Extract anonymity from the third column
            const anonymityText = $(cells[2]).text().trim();
            let anonymity = "unknown";
            if (anonymityText.includes("HIA")) {
                anonymity = "elite";
            } else if (anonymityText.includes("ANM")) {
                anonymity = "anonymous";
            } else if (anonymityText.includes("NOA")) {
                anonymity = "transparent";
            }

            // Extract country from the fourth column
            const countryCell = $(cells[3]).text().trim();
            const country = countryCell.split(" ")[0] || "unknown";

            return {
                ip,
                port,
                type: type.includes("socks5") ? ProxyType.SOCKS5 : ProxyType.HTTP,
                anonymity,
                country,
                providerMetrics: {},
            };
        })
        .get() as IProxy[];

    // Filter out any null values and return valid proxies
    return proxyList.filter((proxy): proxy is IProxy => proxy !== null);
};

export default scrape;
