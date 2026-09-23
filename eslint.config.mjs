import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  {
    rules: {
      // A leading underscore marks an argument that a signature requires but
      // the body does not use - the state and formData a bound server action
      // receives from useActionState, for instance.
      "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    // Written by `pnpm test:coverage`; generated, and gitignored already.
    "coverage/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
