import { clean, sanitizeTitle } from "./title";

export function similarity(externalTitle: string, title: string, titleArray: string[] = []): { same: boolean; value: number } {
    if (!title) {
        title = "";
    }
    let simi = compareTwoStrings(sanitizeTitle(title.toLowerCase()), externalTitle.toLowerCase());
    titleArray.forEach((el) => {
        if (el) {
            const tempSimi = compareTwoStrings(title.toLowerCase(), el.toLowerCase());
            if (tempSimi > simi) simi = tempSimi;
        }
    });
    let found = false;
    if (simi > 0.6) {
        found = true;
    }

    return {
        same: found,
        value: simi,
    };
}

// From npm package string-similarity
export function compareTwoStrings(first: string, second: string): number {
    first = first.replace(/\s+/g, "");
    second = second.replace(/\s+/g, "");

    if (first === second) return 1; // identical or empty
    if (first.length < 2 || second.length < 2) return 0; // if either is a 0-letter or 1-letter string

    const firstBigrams = new Map();
    for (let i = 0; i < first.length - 1; i++) {
        const bigram = first.substring(i, i + 2);
        const count = firstBigrams.has(bigram) ? firstBigrams.get(bigram) + 1 : 1;

        firstBigrams.set(bigram, count);
    }

    let intersectionSize = 0;
    for (let i = 0; i < second.length - 1; i++) {
        const bigram = second.substring(i, i + 2);
        const count = firstBigrams.has(bigram) ? firstBigrams.get(bigram) : 0;

        if (count > 0) {
            firstBigrams.set(bigram, count - 1);
            intersectionSize++;
        }
    }

    return (2.0 * intersectionSize) / (first.length + second.length - 2);
}

export function findBestMatch(mainString: string, targetStrings: string[]): StringResult {
    if (!areArgsValid(mainString, targetStrings)) {
        throw new Error("Bad arguments: First argument should be a string, second should be an array of strings");
    }

    const ratings: { target: string; rating: number }[] = [];
    let bestMatchIndex = 0;

    for (let i = 0; i < targetStrings.length; i++) {
        const currentTargetString: string = targetStrings[i];
        const currentRating: number = compareTwoStrings(mainString, currentTargetString);
        ratings.push({ target: currentTargetString, rating: currentRating });
        if (currentRating > ratings[bestMatchIndex].rating) {
            bestMatchIndex = i;
        }
    }

    const bestMatch = ratings[bestMatchIndex];

    return { ratings: ratings, bestMatch: bestMatch, bestMatchIndex: bestMatchIndex };
}

export function findBestMatchArray(mainStrings: string[], targetStrings: string[]): StringResult {
    const mainStringResults: StringResult[] = [];

    mainStrings.forEach((mainString) => {
        const ratings: { target: string; rating: number; main: string }[] = [];
        let bestMatchIndex = 0;

        for (let i = 0; i < targetStrings.length; i++) {
            const currentTargetString: string = targetStrings[i];
            const currentRating: number = compareTwoStrings(mainString, currentTargetString);
            ratings.push({ target: currentTargetString, rating: currentRating, main: mainString });

            if (currentRating > ratings[bestMatchIndex].rating) {
                bestMatchIndex = i;
            }
        }

        mainStringResults.push({
            ratings: ratings,
            bestMatch: ratings[bestMatchIndex],
            bestMatchIndex: bestMatchIndex,
        });
    });

    let overallBestMatchIndex = 0;
    for (let i = 1; i < mainStringResults.length; i++) {
        if (mainStringResults[i].bestMatch.rating > mainStringResults[overallBestMatchIndex].bestMatch.rating) {
            overallBestMatchIndex = i;
        }
    }

    return mainStringResults[overallBestMatchIndex];
}

export function findBestMatch2DArray(mainStrings: string[], targetStrings: string[][]): StringResult {
    let overallBestMatch: StringResult = {
        ratings: [],
        bestMatch: { target: "", rating: 0 },
        bestMatchIndex: 0,
    };

    mainStrings.forEach((mainString) => {
        targetStrings.forEach((targetArray, targetArrayIndex) => {
            const ratings: Array<{ target: string; rating: number }> = [];

            targetArray.forEach((targetString) => {
                const currentRating = compareTwoStrings(clean(mainString.toLowerCase().trim()), clean(targetString).toLowerCase().trim());

                ratings.push({ target: targetString, rating: currentRating });
            });

            const bestMatchIndex = ratings.reduce((bestIndex, x, i, arr) => (x.rating > arr[bestIndex].rating ? i : bestIndex), 0);

            if (ratings[bestMatchIndex].rating > overallBestMatch.bestMatch.rating) {
                overallBestMatch = {
                    ratings,
                    bestMatch: ratings[bestMatchIndex],
                    bestMatchIndex: targetArrayIndex,
                };
            }
        });
    });

    return overallBestMatch;
}
function areArgsValid(mainString: string, targetStrings: string[]): boolean {
    if (typeof mainString !== "string") return false;
    if (!Array.isArray(targetStrings)) return false;
    if (!targetStrings.length) return false;
    if (
        targetStrings.find(function (s) {
            return typeof s !== "string";
        })
    )
        return false;
    return true;
}

interface StringResult {
    ratings: Array<{ target: string; rating: number }>;
    bestMatch: { target: string; rating: number };
    bestMatchIndex: number;
}
