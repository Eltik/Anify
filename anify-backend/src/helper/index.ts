import { compareTwoStrings } from "./stringSimilarity";

export const USER_AGENT = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.103 Safari/537.36";

export function wait(time: number) {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}

export function isJson(str: string) {
    try {
        JSON.parse(str);
    } catch (e) {
        return false;
    }
    return true;
}

export function substringBefore(str: string, toFind: string) {
    const index = str.indexOf(toFind);
    return index == -1 ? "" : str.substring(0, index);
}

export function substringAfter(str: string, toFind: string) {
    const index = str.indexOf(toFind);
    return index == -1 ? "" : str.substring(index + toFind.length);
}

export function sanitizeTitle(title): string {
    let resTitle = title.replace(/ *(\(dub\)|\(sub\)|\(uncensored\)|\(uncut\)|\(subbed\)|\(dubbed\))/i, "");
    resTitle = resTitle.replace(/ *\([^)]+audio\)/i, "");
    resTitle = resTitle.replace(/ BD( |$)/i, "");
    resTitle = resTitle.replace(/\(TV\)/g, "");
    resTitle = resTitle.trim();
    resTitle = resTitle.substring(0, 99); // truncate
    return resTitle;
}

export function similarity(externalTitle, title, titleArray: string[] = []): { same: boolean; value: number } {
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

export function stringSearch(string: string, pattern: string): number {
    let count = 0;
    string = string.toLowerCase();
    pattern = pattern.toLowerCase();
    string = string.replace(/[^a-zA-Z0-9 -]/g, "");
    pattern = pattern.replace(/[^a-zA-Z0-9 -]/g, "");

    for (let i = 0; i < string.length; i++) {
        for (let j = 0; j < pattern.length; j++) {
            if (pattern[j] !== string[i + j]) break;
            if (j === pattern.length - 1) count++;
        }
    }
    return count;
}

export function setIntervalImmediately(func: () => Promise<void>, interval) {
    func();
    return setInterval(async () => {
        try {
            await func();
        } catch (e) {
            console.error("Error occurred while trying to execute the interval function: ", e);
        }
    }, interval);
}

export const slugify = (...args: (string | number)[]): string => {
    const replaceLoweringCase = (string, [regExp, replacement]) => string.replace(RegExp(regExp, "giu"), replacement);

    let value = args.join(" ");

    defaultReplacements.forEach(([a, b]) => {
        value = replaceLoweringCase(value, [a, b]);
    });

    return value
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "-")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 ]/g, "-")
        .replace(/\s+/g, "-");
};

const defaultReplacements = [
    ["[aàáâãäåāăąǻάαа]", "a"],
    ["[bбḃ]", "b"],
    ["[cçćĉċčћ]", "c"],
    ["[dðďđδдђḋ]", "d"],
    ["[eèéêëēĕėęěέεеэѐё]", "e"],
    ["[fƒφфḟ]", "f"],
    ["[gĝğġģγгѓґ]", "g"],
    ["[hĥħ]", "h"],
    ["[iìíîïĩīĭįıΐήίηιϊийіїѝ]", "i"],
    ["[jĵј]", "j"],
    ["[kķĸκкќ]", "k"],
    ["[lĺļľŀłλл]", "l"],
    ["[mμмṁ]", "m"],
    ["[nñńņňŉŋνн]", "n"],
    ["[oòóôõöōŏőοωόώо]", "o"],
    ["[pπпṗ]", "p"],
    ["q", "q"],
    ["[rŕŗřρр]", "r"],
    ["[sśŝşšſșςσсṡ]", "s"],
    ["[tţťŧțτтṫ]", "t"],
    ["[uùúûüũūŭůűųуў]", "u"],
    ["[vβв]", "v"],
    ["[wŵẁẃẅ]", "w"],
    ["[xξ]", "x"],
    ["[yýÿŷΰυϋύыỳ]", "y"],
    ["[zźżžζз]", "z"],
    ["[æǽ]", "ae"],
    ["[χч]", "ch"],
    ["[ѕџ]", "dz"],
    ["ﬁ", "fi"],
    ["ﬂ", "fl"],
    ["я", "ia"],
    ["[ъє]", "ie"],
    ["ĳ", "ij"],
    ["ю", "iu"],
    ["х", "kh"],
    ["љ", "lj"],
    ["њ", "nj"],
    ["[øœǿ]", "oe"],
    ["ψ", "ps"],
    ["ш", "sh"],
    ["щ", "shch"],
    ["ß", "ss"],
    ["[þθ]", "th"],
    ["ц", "ts"],
    ["ж", "zh"],

    // White_Space, General_Category=Dash_Punctuation and Control Codes
    ["[\\u0009-\\u000D\\u001C-\\u001F\\u0020\\u002D\\u0085\\u00A0\\u1680\\u2000-\\u200A\\u2028\\u2029\\u202F\\u205F\\u3000\\u058A\\u05BE\\u1400\\u1806\\u2010-\\u2015\\u2E17\\u2E1A\\u2E3A\\u2E3B\\u2E40\\u301C\\u3030\\u30A0\\uFE31\\uFE32\\uFE58\\uFE63\\uFF0D]", "-"],
];

export function isString(object: unknown): object is string {
    return typeof object === "string";
}
