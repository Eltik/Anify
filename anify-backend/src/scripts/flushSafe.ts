import dotenv from "dotenv";
dotenv.config();

import { flushSafely } from "../keys";

flushSafely().then(process.exit(0));
