import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Lint Subfase 2 — Claude Code plugin/skill scripts are tooling
    // helpers, not application code. Many ship as minified UMD bundles
    // that fail @typescript-eslint/no-unused-expressions and pollute
    // the warning surface. They are intentionally excluded from app
    // linting; their own tooling owns their quality.
    ".claude/**",
  ]),
]);

export default eslintConfig;
