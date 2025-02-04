import { ProxyType, type IProxy } from "../../../../../../types/impl/proxies";

const scrape = async (): Promise<IProxy[]> => {
    const http = await (await fetch("https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/http.txt")).text();
    const socks5 = await (await fetch("https://raw.githubusercontent.com/TheSpeedX/SOCKS-List/master/socks5.txt")).text();

    const proxyList = http.split("\n").map((line) => {
        const [host, port] = line.split(":");
        return {
            port: parseInt(port),
            anonymity: "unknown",
            country: "unknown",
            ip: host,
            type: ProxyType.HTTP,
            providerMetrics: {},
        } as IProxy;
    }).concat(socks5.split("\n").map((line) => {
        const [host, port] = line.split(":");
        return {
            port: parseInt(port),
            anonymity: "unknown",
            country: "unknown",
            ip: host,
            type: ProxyType.SOCKS5,
            providerMetrics: {},
        } as IProxy;
    }));

    return proxyList;
};

export default scrape;
