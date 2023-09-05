import dotenv from "dotenv";
dotenv.config();

import { search } from "./database/impl/search";
import { Type } from "./types/enums";
import { init } from "./database";
import { scrapeCorsProxies } from "./proxies/impl/scrapeProxies";
import { checkCorsProxies } from "./proxies/impl/checkProxies";
import { fetchCorsProxies } from "./proxies/impl/fetchProxies";

fetchCorsProxies().then(console.log);
