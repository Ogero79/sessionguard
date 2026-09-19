/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["<rootDir>/src"],
  testMatch: ["**/__tests__/**/*.test.ts", "**/*.test.ts"],
  moduleFileExtensions: ["ts", "js", "json"],
  transform: {
    "^.+\\.ts$": ["ts-jest", {
      tsconfig: "tsconfig.json",
    }],
  },
  // Don't require actual Prisma client or external services for unit tests
  moduleNameMapper: {
    "^../config/prisma$": "<rootDir>/src/__tests__/__mocks__/prisma.ts",
  },
  collectCoverageFrom: [
    "src/services/**/*.ts",
    "!src/services/ml-client.service.ts",
    "!src/**/__tests__/**",
    "!src/**/__mocks__/**",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "text-summary", "lcov"],
};
