export function clean(title: string) {
    return transformSpecificVariations(
        removeSpecialChars(
            title
                ?.replaceAll(/[^A-Za-z0-9!@#$%^&*() ]/gim, " ")
                .replaceAll(/(th|rd|nd|st) (Season|season)/gim, "")
                .replaceAll(/\([^\(]*\)$/gim, "")
                .replaceAll("season", "")
                .replaceAll("  ", " ")
                .replaceAll('"', "")
                .trimEnd(),
        ),
    );
}

export function removeSpecialChars(title: string) {
    return title
        ?.replaceAll(/[^A-Za-z0-9!@#$%^&*()\-= ]/gim, " ")
        .replaceAll(/[^A-Za-z0-9\-= ]/gim, "")
        .replaceAll("  ", " ");
}

export function transformSpecificVariations(title: string) {
    return title?.replaceAll("yuu", "yu").replaceAll(" ou", " oh");
}

export function sanitizeTitle(title: string): string {
    let resTitle = title.replace(/ *(\(dub\)|\(sub\)|\(uncensored\)|\(uncut\)|\(subbed\)|\(dubbed\))/i, "");
    resTitle = resTitle.replace(/ *\([^)]+audio\)/i, "");
    resTitle = resTitle.replace(/ BD( |$)/i, "");
    resTitle = resTitle.replace(/\(TV\)/g, "");
    resTitle = resTitle.trim();
    resTitle = resTitle.substring(0, 99); // truncate
    return resTitle;
}

export const slugify = (...args: (string | number)[]): string => {
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

    const replaceLoweringCase = (string: string, [regExp, replacement]: any) => string.replace(RegExp(regExp, "giu"), replacement);

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
