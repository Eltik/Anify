import dotenv from "dotenv";
dotenv.config();

import { fetchCorsProxies } from "./proxies/impl/fetchProxies";
import NineAnime from "./mappings/impl/anime/nineanime";

fetchCorsProxies().then(async (_) => {
    const nineAnime = new NineAnime();
    const data = await nineAnime.search("Mushoku Tensei");
    console.log(data);
});
