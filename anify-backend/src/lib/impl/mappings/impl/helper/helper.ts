/**
 * @author shimizu.dev_ from the Anify Discord
 */

import type { IMediaBase } from "../../../../../types/impl/mappings";

/**
 * Cleans and normalizes a given title string for comparison.
 * @param {string | undefined} title - The title string to clean.
 * @returns {string | undefined} - The cleaned and normalized title string, or undefined if the input was undefined.
 */
export function cleanTitle(title?: string): string | undefined {
    if (!title) return undefined;

    // Normalize the string to remove accents and other diacritical marks
    return (
        title
            .normalize("NFKC")
            // Replace non-word characters with spaces
            .replace(/[^\w\s]/g, " ")
            // Remove duplicate spaces
            .replace(/\s+/g, " ")
            // Trim leading and trailing spaces
            .trim()
            // Limit the length of the title to 100 characters
            .slice(0, 100)
    );
}

/**
 * Sanitizes a title string by removing unnecessary words and characters for comparison.
 * @param {string | undefined} title - The title string to sanitize.
 * @returns {string | undefined} - The sanitized title string, or undefined if the input was undefined.
 */
export function sanitizeTitle(title?: string): string | undefined {
    if (!title) return undefined;

    let sanitized = title
        .toLowerCase()
        .replaceAll("chapters", "chapter")
        // Remove specific words related to anime seasons or parts
        .replace(/\b(season|cour|part|chapter|special)\b/g, "")
        // Remove specific words related to anime seasons or parts with numbers
        .replace(/(\d+)(?:th|rd|nd|st)?\s*(?:season|cour|part|chapter|special)\b/gi, " $1 ")
        // Remove non-alphanumeric characters
        .replace(/[^a-z0-9\s]/g, "")
        // Replace specific words to ensure consistency
        .replace(/yuu/g, "yu")
        .replace(/ouh/g, "oh")
        .replace(/yaa/g, "ya")
        // Remove specific words related to anime formats or additional information
        .replace(/\b(?:uncut|uncensored|dub(?:bed)?|censored|sub(?:bed)?|the final chapters)\b|\([^)]*\)|\bd\b|\(tv\)/gi, "");

    // Normalize the string to remove accents and other diacritical marks, and then remove diacritical marks
    sanitized = sanitized.normalize("NFD").replace(/\p{M}/gu, "");
    return cleanTitle(sanitized);
}

/**
 * Extracts the year from a given title string.
 * @param {string} title - The title string to extract the year from.
 * @returns {number | null} - The extracted year, or null if no year was found.
 */
export function extractYear(title: string): number | null {
    const yearMatch = title.match(/\b(19|20)\d{2}\b/);
    return yearMatch ? Number.parseInt(yearMatch[0]) : null;
}

/**
 * Gets all available titles from an ITitle object or returns an array with just the string if given a string
 * @param {IMediaBase["title"] | string} title - The title to get all variations from
 * @returns {string[]} - Array of all available title variations
 */
export function getAllTitles(title: IMediaBase["title"] | string): string[] {
    if (typeof title === "string") return [title];
    return [title?.english, title?.romaji, title?.native].filter((t): t is string => !!t);
}
