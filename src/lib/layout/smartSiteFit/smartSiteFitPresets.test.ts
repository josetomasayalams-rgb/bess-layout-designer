import { describe, expect, it } from "vitest";
import {
  SUNGROW_ST2752UX_SC5000UD_PRESET,
  getDefaultSmartSiteFitPreset,
  getContainersPerPcsForDuration,
  adjustPresetForDuration,
} from "./smartSiteFitPresets";

describe("SmartSiteFit Presets", () => {
  it("should have correct predefined properties in SUNGROW_ST2752UX_SC5000UD_PRESET", () => {
    expect(SUNGROW_ST2752UX_SC5000UD_PRESET.id).toBe("sungrow-st2752ux-sc5000ud");
    expect(SUNGROW_ST2752UX_SC5000UD_PRESET.bessSpecId).toBe("sungrow-st2752ux-us");
    expect(SUNGROW_ST2752UX_SC5000UD_PRESET.pcsSpecId).toBe("sungrow-sc5000ud-mv-us-p3");
    expect(SUNGROW_ST2752UX_SC5000UD_PRESET.bessPerPcs2h).toBe(4);
    expect(SUNGROW_ST2752UX_SC5000UD_PRESET.bessPerPcs4h).toBe(8);
    expect(SUNGROW_ST2752UX_SC5000UD_PRESET.dataClassification).toBe("preliminary_assumption");
  });

  it("should return default preset", () => {
    expect(getDefaultSmartSiteFitPreset()).toEqual(SUNGROW_ST2752UX_SC5000UD_PRESET);
  });

  it("should calculate correct BESS per PCS count based on duration", () => {
    expect(getContainersPerPcsForDuration(2)).toBe(4);
    expect(getContainersPerPcsForDuration(1.5)).toBe(4);
    expect(getContainersPerPcsForDuration(4)).toBe(8);
    expect(getContainersPerPcsForDuration(3)).toBe(8);
    expect(getContainersPerPcsForDuration(6)).toBe(12);
  });

  it("should adjust preset notes and duration correctly", () => {
    const adjusted = adjustPresetForDuration(SUNGROW_ST2752UX_SC5000UD_PRESET, 6);
    expect(adjusted.defaultDurationHours).toBe(6);
    expect(adjusted.notes).toContain("Ajustado para duración de 6h");
    expect(adjusted.notes).toContain("12 BESS por PCS");
  });
});
