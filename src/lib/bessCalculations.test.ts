import { describe, expect, it } from "vitest";
import { bessModels } from "@/data/bessModels";
import { rankBessModels } from "@/lib/bessCalculations";

describe("BESS model calculations", () => {
  it("loads the initial 17 utility-scale BESS models", () => {
    expect(bessModels).toHaveLength(17);
    expect(bessModels.every((model) => model.areaM2 > 0)).toBe(true);
    expect(bessModels.every((model) => model.volumeM3 > 0)).toBe(true);
  });

  it("calculates derived metrics for a high-density model", () => {
    const sungrow = bessModels.find(
      (model) => model.id === "sungrow-powertitan-st6900ux-4h"
    );
    expect(sungrow?.energyDensityMWhPerM2).toBeCloseTo(0.467, 3);
    expect(sungrow?.durationHours).toBeCloseTo(3.84, 2);
  });

  it("flags commercial duration mismatch without changing source values", () => {
    const byd = bessModels.find((model) => model.id === "byd-standard-container-4h");
    expect(byd?.durationHours).toBe(2);
    expect(byd?.warnings.some((warning) => warning.includes("product name"))).toBe(true);
  });

  it("ranks models by surface energy density", () => {
    const [top] = rankBessModels(bessModels, "mwh_per_m2");
    expect(top.id).toBe("sungrow-powertitan-st6900ux-4h");
  });
});

