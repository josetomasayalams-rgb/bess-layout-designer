import { describe, expect, it } from "vitest";
import {
  resolveContainersPerPcs,
  resolveSeparatePcsEquipment,
} from "./smartSiteFitEquipmentResolution";
import { SUNGROW_ST2752UX_SC5000UD_PRESET } from "./smartSiteFitPresets";
import type { SmartSiteFitPreset } from "./smartSiteFitTypes";

describe("resolveContainersPerPcs", () => {
  it("uses the Sungrow preset ratioByDuration table for supported durations", () => {
    const p = SUNGROW_ST2752UX_SC5000UD_PRESET;
    expect(resolveContainersPerPcs(p, 2)).toBe(4);
    expect(resolveContainersPerPcs(p, 4)).toBe(8);
    expect(resolveContainersPerPcs(p, 8)).toBe(16);
    expect(resolveContainersPerPcs(p, 16)).toBe(32);
  });

  it("honors a custom preset ratio instead of the Sungrow schedule", () => {
    const custom: SmartSiteFitPreset = {
      ...SUNGROW_ST2752UX_SC5000UD_PRESET,
      id: "custom-separate-pcs",
      ratioByDuration: { 4: 6 },
    };
    // Exact match.
    expect(resolveContainersPerPcs(custom, 4)).toBe(6);
    // Only 4h is defined -> nearest supported duration is still 6, not Sungrow's 16.
    expect(resolveContainersPerPcs(custom, 8)).toBe(6);
  });

  it("falls back to the duration heuristic when the preset has no table", () => {
    const noTable: SmartSiteFitPreset = {
      ...SUNGROW_ST2752UX_SC5000UD_PRESET,
      id: "no-table",
      ratioByDuration: undefined,
    };
    expect(resolveContainersPerPcs(noTable, 4)).toBe(8);
    expect(resolveContainersPerPcs(noTable, 2)).toBe(4);
  });
});

describe("resolveSeparatePcsEquipment", () => {
  it("resolves Sungrow ids, footprints and ratings from the catalog", () => {
    const eq = resolveSeparatePcsEquipment(SUNGROW_ST2752UX_SC5000UD_PRESET, 4);
    expect(eq.bessSpecId).toBe("sungrow-st2752ux-us");
    expect(eq.pcsSpecId).toBe("sungrow-sc5000ud-mv-us-p3");
    expect(eq.bess).toEqual({ length_m: 9.34, width_m: 1.73 });
    expect(eq.pcs).toEqual({ length_m: 6.058, width_m: 2.438 });
    expect(eq.energyPerBessMWh).toBe(2.752);
    expect(eq.powerPerPcsMW).toBe(5);
    expect(eq.containersPerPcs).toBe(8);
  });

  it("keeps a custom preset's own ids/ratio and falls back to safe dims for unknown specs", () => {
    const custom: SmartSiteFitPreset = {
      ...SUNGROW_ST2752UX_SC5000UD_PRESET,
      id: "custom-separate-pcs",
      bessSpecId: "acme-bess-3000",
      pcsSpecId: "acme-pcs-6000",
      ratioByDuration: { 4: 5 },
    };
    const eq = resolveSeparatePcsEquipment(custom, 4);
    expect(eq.bessSpecId).toBe("acme-bess-3000");
    expect(eq.pcsSpecId).toBe("acme-pcs-6000");
    expect(eq.containersPerPcs).toBe(5);
    // Specs absent from the catalog -> non-zero fallback dims/ratings so the
    // engine never divides by zero nor places a zero-area rectangle.
    expect(eq.bess.length_m).toBeGreaterThan(0);
    expect(eq.bess.width_m).toBeGreaterThan(0);
    expect(eq.pcs.length_m).toBeGreaterThan(0);
    expect(eq.pcs.width_m).toBeGreaterThan(0);
    expect(eq.energyPerBessMWh).toBeGreaterThan(0);
    expect(eq.powerPerPcsMW).toBeGreaterThan(0);
  });
});
