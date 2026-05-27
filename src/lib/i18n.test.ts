/**
 * Phase 14.4 — `i18n` module.
 *
 * Pre-Phase 14 coverage was 16.66 %. The module is data-heavy (large
 * COPY dictionaries) — these tests cover the public helper functions
 * and a key-parity guard between English and Spanish copy.
 */

import { describe, expect, it } from "vitest";
import {
  COPY,
  constraintCopy,
  copyFor,
  modeLabel,
  reliabilityLabel,
  scenarioStatusLabel,
  severityLabel,
} from "./i18n";

describe("i18n — copyFor", () => {
  it("returns the English bundle for 'en'", () => {
    expect(copyFor("en")).toBe(COPY.en);
  });

  it("returns the Spanish bundle for 'es'", () => {
    expect(copyFor("es")).toBe(COPY.es);
  });
});

describe("i18n — label helpers", () => {
  it("modeLabel returns a non-empty string for each mode in both locales", () => {
    const modes = [
      "select",
      "draw-site",
      "place-equipment",
      "draw-repair-zone",
      "edit-layout",
    ] as const;
    for (const m of modes) {
      expect(modeLabel(m, "en").length).toBeGreaterThan(0);
      expect(modeLabel(m, "es").length).toBeGreaterThan(0);
    }
  });

  it("severityLabel returns a non-empty string for each severity", () => {
    expect(severityLabel("error", "en").length).toBeGreaterThan(0);
    expect(severityLabel("warn", "es").length).toBeGreaterThan(0);
    expect(severityLabel("info", "en").length).toBeGreaterThan(0);
  });

  it("reliabilityLabel returns a non-empty string", () => {
    expect(reliabilityLabel("certified_data", "en").length).toBeGreaterThan(0);
    expect(
      reliabilityLabel("preliminary_assumption", "es").length
    ).toBeGreaterThan(0);
  });

  it("scenarioStatusLabel falls back to the input string when missing", () => {
    expect(scenarioStatusLabel("unknown-status-token", "en")).toBe(
      "unknown-status-token"
    );
  });

  it("constraintCopy falls back to label = id when missing", () => {
    const result = constraintCopy("some-non-existent-constraint", "en");
    expect(result.label).toBe("some-non-existent-constraint");
    expect(typeof result.notes).toBe("string");
  });
});

describe("i18n — key parity en ↔ es", () => {
  it("modes have the same keys in both bundles", () => {
    expect(Object.keys(COPY.en.modes).sort()).toEqual(
      Object.keys(COPY.es.modes).sort()
    );
  });

  it("severity has the same keys", () => {
    expect(Object.keys(COPY.en.severity).sort()).toEqual(
      Object.keys(COPY.es.severity).sort()
    );
  });

  it("reliability has the same keys", () => {
    expect(Object.keys(COPY.en.reliability).sort()).toEqual(
      Object.keys(COPY.es.reliability).sort()
    );
  });
});
