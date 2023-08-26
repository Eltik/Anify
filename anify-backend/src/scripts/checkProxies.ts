import dotenv from "dotenv";
dotenv.config();

import { checkCorsProxies } from "../helper/proxies";

checkCorsProxies().then(console.log);
