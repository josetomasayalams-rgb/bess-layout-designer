/**
 * Drift guard — keeps the report's visual identity single-sourced in
 * `reportTheme.ts`. After the redesign, the brand accent and palette must come
 * from the theme tokens, not be re-hardcoded per component (which is exactly
 * how the PDF and the old HTML preview drifted to three different accents).
 */
import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));

function reportSourceFiles(): string[] {
  return readdirSync(here).filter(
    (f) =>
      /\.(ts|tsx)$/.test(f) &&
      !f.includes(".test.") &&
      f !== "reportTheme.ts"
  );
}

describe("report theme drift guard", () => {
  it("no report module hardcodes the brand accent hex (must reference reportTheme)", () => {
    for (const f of reportSourceFiles()) {
      const content = readFileSync(join(here, f), "utf8");
      expect(content.includes("#0284c7"), `${f} hardcodes the accent hex`).toBe(
        false
      );
    }
  });

  it("no report module reintroduces a violet brand (the preview's former divergent accent)", () => {
    for (const f of reportSourceFiles()) {
      const content = readFileSync(join(here, f), "utf8");
      expect(/violet-\d/.test(content), `${f} uses a violet utility class`).toBe(
        false
      );
    }
  });

  it("exposes the canonical accent only from reportTheme", () => {
    const theme = readFileSync(join(here, "reportTheme.ts"), "utf8");
    expect(theme.includes("#0284c7")).toBe(true);
  });
});
