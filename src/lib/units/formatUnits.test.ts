import { describe, expect, it } from "vitest";
import {
  formatAreaDual,
  formatAreaM2,
  formatEnergyMWh,
  formatLength,
  formatMassTonnes,
  formatRatioAsPercentage,
} from "./formatUnits";

describe("metric/SI unit formatting", () => {
  it("formats length and area with SI units", () => {
    expect(formatLength(3, { digits: 0 })).toBe("3 m");
    expect(formatAreaM2(12500, { digits: 0 })).toBe("12,500 m²");
    expect(formatAreaDual(12500, { locale: "es" })).toBe("12.500 m² / 1,25 ha");
  });

  it("formats technical BESS quantities", () => {
    expect(formatEnergyMWh(200, { digits: 0 })).toBe("200 MWh");
    expect(formatMassTonnes(26400, { locale: "es", digits: 1 })).toBe("26,4 t");
    expect(formatRatioAsPercentage(0.1234, { digits: 2 })).toBe("12.34 %");
  });
});
