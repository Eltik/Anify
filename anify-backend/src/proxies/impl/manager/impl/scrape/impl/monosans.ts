import { ProxyType, type IProxy } from "../../../../../../types/impl/proxies";

const scrape = async (): Promise<IProxy[]> => {
    const data = await (await fetch("https://raw.githubusercontent.com/monosans/proxy-list/refs/heads/main/proxies_anonymous/http.txt")).text();
    const proxyList = data.split("\n").map((line) => {
        const [host, port] = line.split(":");
        return {
            port: parseInt(port),
            anonymity: "unknown",
            country: "unknown",
            ip: host,
            type: ProxyType.HTTP,
            providerMetrics: {},
        };
    }) as IProxy[];

    return proxyList;
};

export default scrape;
