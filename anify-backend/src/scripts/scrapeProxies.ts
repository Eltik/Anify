import dotenv from "dotenv";
dotenv.config();

import { scrapeCorsProxies } from "../helper/proxies";

scrapeCorsProxies().then(console.log);
