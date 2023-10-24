/**
 * @description Handles the scraping of CORS proxies.
 */

// List of CORS proxies
export const BASE_PROXIES: { providerId: string; ip: string }[] = [];
export const ANIME_PROXIES: { providerId: string; ip: string }[] = [];
export const MANGA_PROXIES: { providerId: string; ip: string }[] = [];
export const META_PROXIES: { providerId: string; ip: string }[] = [];
export const toCheck: string[] = [];
