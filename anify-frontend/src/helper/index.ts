import { Format, MediaStatus } from "~/types";

export function capitalize(s: string) {
    s = s?.toLowerCase();
    return s && (s[0]?.toUpperCase() ?? "") + s.slice(1);
}

export function truncate(text: string, maxLength: number) {
    if (text.length > maxLength) {
        return text.substring(0, maxLength - 3) + '...';
    } else {
        return text;
    }
}

export function parseFormat(format: Format) {
    return format === Format.TV ? "TV" : format === Format.ONA ? "ONA" : format === Format.OVA ? "OVA" : format === Format.TV_SHORT ? "TV Short" : capitalize(format);
}

export function parseStatus(status: MediaStatus) {
    return status === MediaStatus.NOT_YET_RELEASED ? "Not released" : capitalize(status);
}

export function formatCompactNumber(number: number) {
    if (number < 1000) {
        return number;
    } else if (number >= 1000 && number < 1_000_000) {
        return (number / 1000).toFixed(1) + "k";
    } else if (number >= 1_000_000 && number < 1_000_000_000) {
        return (number / 1_000_000).toFixed(1) + "m";
    } else if (number >= 1_000_000_000 && number < 1_000_000_000_000) {
        return (number / 1_000_000_000).toFixed(1) + "b";
    } else if (number >= 1_000_000_000_000 && number < 1_000_000_000_000_000) {
        return (number / 1_000_000_000_000).toFixed(1) + "t";
    }
}

export function isValidDate(d: any) {
    return d instanceof Date && !isNaN(Number(d));
}