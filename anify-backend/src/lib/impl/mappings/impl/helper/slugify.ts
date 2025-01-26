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

    const replaceLoweringCase = (string: string, [regExp, replacement]: [string, string]) => string.replace(RegExp(regExp, "giu"), replacement);

    let value = args.join(" ");

    for (const [a, b] of defaultReplacements) {
        value = replaceLoweringCase(value, [a, b]);
    }

    return value
        .normalize("NFD")
        .replace(/\u0300|\u0301|\u0302|\u0303|\u0304|\u0305|\u0306|\u0307|\u0308|\u0309|\u030a|\u030b|\u030c|\u030d|\u030e|\u030f|\u0310|\u0311|\u0312|\u0313|\u0314|\u0315|\u0316|\u0317|\u0318|\u0319|\u031a|\u031b|\u031c|\u031d|\u031e|\u031f|\u0320|\u0321|\u0322|\u0323|\u0324|\u0325|\u0326|\u0327|\u0328|\u0329|\u032a|\u032b|\u032c|\u032d|\u032e|\u032f|\u0330|\u0331|\u0332|\u0333|\u0334|\u0335|\u0336|\u0337|\u0338|\u0339|\u033a|\u033b|\u033c|\u033d|\u033e|\u033f|\u0340|\u0341|\u0342|\u0343|\u0344|\u0345|\u0346|\u0347|\u0348|\u0349|\u034a|\u034b|\u034c|\u034d|\u034e|\u034f|\u0350|\u0351|\u0352|\u0353|\u0354|\u0355|\u0356|\u0357|\u0358|\u0359|\u035a|\u035b|\u035c|\u035d|\u035e|\u035f|\u0360|\u0361|\u0362|\u0363|\u0364|\u0365|\u0366|\u0367|\u0368|\u0369|\u036a|\u036b|\u036c|\u036d|\u036e|\u036f/g, "-")
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9 ]/g, "-")
        .replace(/\s+/g, "-");
};
