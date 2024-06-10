// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require("path");

/** @type {import("eslint").Linter.Config} */
const config = {
    parser: "@typescript-eslint/parser",
    parserOptions: {
        project: path.join(__dirname, "tsconfig.json"),
    },
    plugins: ["@typescript-eslint"],
    extends: ["plugin:@typescript-eslint/recommended"],
    rules: {
        "@typescript-eslint/no-explicit-any": "off",
    },
    ignorePatterns: ["dist/*", "node_modules/*", ".DS_Store"],
};

module.exports = config;
