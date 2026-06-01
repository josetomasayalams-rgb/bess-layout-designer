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
    expect(SUNGROW_ST2752UX_SC5000UD_PRESET.supportedDurations).toEqual([2, 4, 8, 16]);
    expect(SUNGROW_ST2752UX_SC5000UD_PRESET.ratioByDuration).toEqual({
      2: 4,
      4: 8,
      8: 16,
      16: 32,
    });
  });

  it("should return default preset", () => {
    expect(getDefaultSmartSiteFitPreset()).toEqual(SUNGROW_ST2752UX_SC5000UD_PRESET);
  });

  it("should calculate correct BESS per PCS count based on duration", () => {
    expect(getContainersPerPcsForDuration(2)).toBe(4);
    expect(getContainersPerPcsForDuration(1.5)).toBe(4);
    expect(getContainersPerPcsForDuration(4)).toBe(8);
    expect(getContainersPerPcsForDuration(3)).toBe(8);
    expect(getContainersPerPcsForDuration(8)).toBe(16);
    expect(getContainersPerPcsForDuration(16)).toBe(32);
  });

  it("should adjust preset notes and duration correctly", () => {
    const adjusted8 = adjustPresetForDuration(SUNGROW_ST2752UX_SC5000UD_PRESET, 8);
    expect(adjusted8.defaultDurationHours).toBe(8);
    expect(adjusted8.notes).toContain("Ajustado para duración de 8h");
    expect(adjusted8.notes).toContain("16 BESS por PCS");

    const adjusted16 = adjustPresetForDuration(SUNGROW_ST2752UX_SC5000UD_PRESET, 16);
    expect(adjusted16.defaultDurationHours).toBe(16);
    expect(adjusted16.notes).toContain("Ajustado para duración de 16h");
    expect(adjusted16.notes).toContain("32 BESS por PCS");
  });
});
