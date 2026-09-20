import type { Config } from "jest";
import nextJest from "next/jest.js";

// `next/jest` wires up the SWC transform, CSS/image module mocking and the
// `@/*` path alias from tsconfig. Deliberately not ts-jest: SWC has no
// per-test cold-cache warm-up, which is the cause of the intermittent
// timeout flakes on gosalci.com.
const createJestConfig = nextJest({ dir: "./" });

const config: Config = {
  testEnvironment: "jest-environment-jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["**/__tests__/**/*.test.{ts,tsx}", "**/*.test.{ts,tsx}"],
  testPathIgnorePatterns: ["<rootDir>/.next/", "<rootDir>/node_modules/"],
  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/layout.tsx",
  ],
};

export default createJestConfig(config);
