import dotenv from "dotenv";
dotenv.config();

import { fetchCorsProxies } from "./proxies/impl/fetchProxies";
import { animeProviders } from "./mappings";

fetchCorsProxies().then(async (_) => {
    const data = await animeProviders["9anime"].search("Mushoku Tensei");
    console.log(data);
});
