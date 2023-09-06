import dotenv from "dotenv";
dotenv.config();

import { fetchCorsProxies } from "./proxies/impl/fetchProxies";
import { loadMapping } from "./lib/impl/mappings";
import { Type } from "./types/enums";

fetchCorsProxies().then(async (_) => {
    const data = await loadMapping({ id: "21", type: Type.ANIME });
    console.log(data);
});
