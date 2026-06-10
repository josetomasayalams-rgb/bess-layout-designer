import { describe, expect, it } from "vitest";
import {
  feederCurrentA,
  feederI2rLossMW,
  feederVoltageDropPct,
  MV_REFERENCE_VOLTAGE_DROP_PCT_PER_KM,
  NEXANS_NA2XS2Y_630_TREFOIL,
  mvReferenceVoltageDrop,
} from "@/lib/electrical/cableVoltageDrop";

describe("cableVoltageDrop — IEC 60364", () => {
  it("computes the 3-phase voltage drop percentage", () => {
    // 462 A, 1 km, 34.5 kV, pf 0.95, R=0.064, X=0.1215
    const pct = feederVoltageDropPct({
      currentA: 462,
      lengthM: 1000,
      voltageV: 34500,
      powerFactor: 0.95,
      resistanceOhmPerKm: 0.064,
      reactanceOhmPerKm: 0.1215,
    });
    expect(pct).toBeCloseTo(0.229, 2);
  });

  it("scales linearly with length", () => {
    const base = feederVoltageDropPct({
      currentA: 462,
      lengthM: 1000,
      voltageV: 34500,
      powerFactor: 0.95,
      resistanceOhmPerKm: 0.064,
      reactanceOhmPerKm: 0.1215,
    });
    const triple = feederVoltageDropPct({
      currentA: 462,
      lengthM: 3000,
      voltageV: 34500,
      powerFactor: 0.95,
      resistanceOhmPerKm: 0.064,
      reactanceOhmPerKm: 0.1215,
    });
    expect(triple).toBeCloseTo(base * 3, 6);
  });

  it("returns 0 for non-positive voltage (guard)", () => {
    expect(
      feederVoltageDropPct({
        currentA: 462,
        lengthM: 1000,
        voltageV: 0,
        powerFactor: 0.95,
        resistanceOhmPerKm: 0.064,
        reactanceOhmPerKm: 0.1215,
      })
    ).toBe(0);
  });

  it("a higher power factor (less reactive) lowers the drop for these R/X", () => {
    const args = {
      currentA: 462,
      lengthM: 1000,
      voltageV: 34500,
      resistanceOhmPerKm: 0.064,
      reactanceOhmPerKm: 0.1215,
    };
    const pf95 = feederVoltageDropPct({ ...args, powerFactor: 0.95 });
    const pf80 = feederVoltageDropPct({ ...args, powerFactor: 0.8 });
    expect(pf95).toBeLessThan(pf80);
  });

  it("feederCurrentA: I = S / (√3·V)", () => {
    // 20 MVA at 34.5 kV ≈ 334.7 A
    expect(feederCurrentA(20, 34.5)).toBeCloseTo(334.7, 1);
    expect(feederCurrentA(20, 0)).toBe(0);
  });

  it("feederI2rLossMW: P = 3·I²·R·L", () => {
    // 334.7 A, 50 km, R=0.064 Ω/km → ~1.075 MW
    expect(
      feederI2rLossMW({ currentA: 334.7, lengthM: 50000, resistanceOhmPerKm: 0.064 })
    ).toBeCloseTo(1.075, 2);
    expect(feederI2rLossMW({ currentA: 334.7, lengthM: 0, resistanceOhmPerKm: 0.064 })).toBe(0);
  });

  it("the reference coefficient is derived (~0.23 %/km) from documented R/X", () => {
    expect(MV_REFERENCE_VOLTAGE_DROP_PCT_PER_KM).toBe(0.23);
    expect(NEXANS_NA2XS2Y_630_TREFOIL.resistanceOhmPerKm).toBe(0.064);
    expect(mvReferenceVoltageDrop.referenceDropPctPerKm.evidence[0].confidence).toBe("derived");
    expect(mvReferenceVoltageDrop.resistanceOhmPerKm.evidence[0].confidence).toBe("documented");
    expect(mvReferenceVoltageDrop.resistanceOhmPerKm.evidence[0].documentId).toBe(
      "NEXANS-NA2XS2Y-19-33"
    );
  });
});
