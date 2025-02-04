/**
 * @fileoverview Scrape proxies from Censys
 */

import { proxyCache } from "../..";
import { saveProxies } from "../file/saveProxies";
import scrapeProxies from "./impl/scrape";

export const CORS_HASH = "c7d96235df80ea051e9d57f3ab6d3e4da289fd3b";
export const MAX_REQUESTS = 50;

export const scrape = async (): Promise<void> => {
    const proxies = await scrapeProxies();

    await saveProxies(proxies);

    proxyCache.proxies = proxyCache.proxies.concat(proxies.filter((proxy) => !proxyCache.proxies.some((p) => p.ip === proxy.ip && p.port === proxy.port)));
};
