import { describe, expect, it } from "vitest";
import {
  deriveEquipmentCountsFromPowerEnergy,
  estimatePowerEnergyFromCounts,
} from "./smartSiteFitSizing";

describe("deriveEquipmentCountsFromPowerEnergy", () => {
  it("derives coherent counts for 100 MW / 400 MWh / 4h", () => {
    const r = deriveEquipmentCountsFromPowerEnergy({
      targetPowerMW: 100,
      targetEnergyMWh: 400,
      durationHours: 4,
    });
    // 100 MW / 5 MVA = 20 PCS; 400 MWh / 2.752 ≈ 146 BESS.
    expect(r.pcsCount).toBe(20);
    expect(r.bessCount).toBe(Math.ceil(400 / 2.752));
    expect(r.effectivePowerMW).toBeGreaterThan(0);
    expect(r.effectiveEnergyMWh).toBeGreaterThan(0);
    expect(r.durationHours).toBe(4);
  });

  it("handles a very large 750 MW / 12000 MWh / 16h target without freezing", () => {
    const r = deriveEquipmentCountsFromPowerEnergy({
      targetPowerMW: 750,
      targetEnergyMWh: 12000,
      durationHours: 16,
    });
    expect(r.bessCount).toBeGreaterThan(0);
    expect(r.pcsCount).toBeGreaterThan(0);
    expect(Number.isFinite(r.bessCount)).toBe(true);
    expect(Number.isFinite(r.pcsCount)).toBe(true);
  });

  it("derives the missing dimension from duration", () => {
    const fromPower = deriveEquipmentCountsFromPowerEnergy({
      targetPowerMW: 50,
      durationHours: 4,
    });
    expect(fromPower.bessCount).toBeGreaterThan(0);

    const fromEnergy = deriveEquipmentCountsFromPowerEnergy({
      targetEnergyMWh: 200,
      durationHours: 4,
    });
    expect(fromEnergy.pcsCount).toBeGreaterThan(0);
  });

  it("warns when energy requires more PCS than the power target implies", () => {
    const r = deriveEquipmentCountsFromPowerEnergy({
      targetPowerMW: 5,
      targetEnergyMWh: 2000,
      durationHours: 2,
    });
    expect(r.warnings.some((w) => w.id === "ssf-power-energy-ratio")).toBe(true);
  });

  it("always returns at least one BESS and one PCS", () => {
    const r = deriveEquipmentCountsFromPowerEnergy({ durationHours: 4 });
    expect(r.bessCount).toBeGreaterThanOrEqual(1);
    expect(r.pcsCount).toBeGreaterThanOrEqual(1);
  });
});

describe("estimatePowerEnergyFromCounts", () => {
  it("estimates approximate power and energy from counts", () => {
    const e = estimatePowerEnergyFromCounts({ bessCount: 40, pcsCount: 5 });
    expect(e.powerMW).toBeCloseTo(25, 6);
    expect(e.energyMWh).toBeCloseTo(110.08, 6);
  });

  it("clamps negative counts to zero", () => {
    const e = estimatePowerEnergyFromCounts({ bessCount: -10, pcsCount: -2 });
    expect(e.powerMW).toBe(0);
    expect(e.energyMWh).toBe(0);
  });
});
