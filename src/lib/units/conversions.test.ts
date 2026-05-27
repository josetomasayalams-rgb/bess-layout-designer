/**
 * Phase 14.4 — `conversions` module.
 *
 * Pre-Phase 14 coverage was 40 % — the module is trivial but every
 * helper is consumed by KPI math and the report, so a deterministic
 * table cements the contract.
 */

import { describe, expect, it } from "vitest";
import {
  kgToTonnes,
  m2ToHa,
  mwToKw,
  mwhToKwh,
  tonnesToKg,
} from "./conversions";

describe("conversions — m² ↔ ha", () => {
  it.each([
    [0, 0],
    [10_000, 1],
    [25_000, 2.5],
    [123_456, 12.3456],
  ])("m2ToHa(%i) === %f", (m2, ha) => {
    expect(m2ToHa(m2)).toBeCloseTo(ha, 6);
  });
});

describe("conversions — kg ↔ tonnes", () => {
  it.each([
    [0, 0],
    [1_000, 1],
    [26_400, 26.4],
  ])("kgToTonnes(%i) === %f", (kg, t) => {
    expect(kgToTonnes(kg)).toBeCloseTo(t, 6);
  });

  it("tonnesToKg is the inverse of kgToTonnes", () => {
    expect(tonnesToKg(kgToTonnes(8765))).toBeCloseTo(8765, 6);
  });
});

describe("conversions — MW/MWh → kW/kWh", () => {
  it("mwToKw multiplies by 1000", () => {
    expect(mwToKw(0.5)).toBeCloseTo(500, 6);
    expect(mwToKw(200)).toBeCloseTo(200_000, 6);
  });

  it("mwhToKwh multiplies by 1000", () => {
    expect(mwhToKwh(0)).toBeCloseTo(0, 6);
    expect(mwhToKwh(2.752)).toBeCloseTo(2752, 6);
  });
});
