/**
 * @description Handles the scraping of CORS proxies.
 */

import colors from "colors";
import { existsSync, writeFileSync } from "fs";
import { readFile, writeFile } from "fs/promises";
import { join } from "path";
import ChunkedExecutor from "./executor";
import { isString } from "../helper";
import { ANIME_PROVIDERS, MANGA_PROVIDERS, META_PROVIDERS } from "../mappings";
import { env } from "bun";

// List of CORS proxies
export const CORS_PROXIES: string[] = [];

export const toCheck: string[] = [];
