export default {
    clearMocks: true,
    collectCoverage: false,
    preset: "ts-jest",
    testEnvironment: "node",
    testMatch: ["**/test/**/*.test.ts"],
    moduleNameMapper: {
        "^@/(.*)$": "<rootDir>/$1",
        "^database$": "<rootDir>/src/database",
    },
};
