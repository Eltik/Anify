import { preloadProxies } from "../../proxies/impl/manager/impl/file/preloadProxies";
import { WebshareScraper } from "../../proxies/impl/scrape/webshare";

export async function scrapeProxies() {
    // Preload existing proxies (if needed)
    await preloadProxies();

    const webshare = new WebshareScraper();
    const proxies = await webshare.scrapeProxies();
    console.log(proxies);
}
