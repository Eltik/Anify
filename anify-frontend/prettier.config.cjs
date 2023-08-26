/** @type {import("prettier").Config} */
const config = {
    plugins: [require.resolve("prettier-plugin-tailwindcss")],
    useTabs: false,
    tabWidth: 4,
    semi: true,
    singleQuote: false,
    bracketSpacing: true,
    bracketSameLine: false,
    arrowParens: "always",
    parser: "typescript",
    printWidth: 10000,
    proseWrap: "never",
    endOfLine: "lf",
};

module.exports = config;
