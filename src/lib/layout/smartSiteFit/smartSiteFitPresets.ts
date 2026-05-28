import type { SmartSiteFitPreset } from "./smartSiteFitTypes";

export const SUNGROW_ST2752UX_SC5000UD_PRESET: SmartSiteFitPreset = {
  id: "sungrow-st2752ux-sc5000ud",
  name: "Sungrow ST2752UX + SC5000UD",
  bessSpecId: "sungrow-st2752ux-us",
  pcsSpecId: "sungrow-sc5000ud-mv-us-p3",
  bessPerPcs2h: 4,
  bessPerPcs4h: 8,
  defaultDurationHours: 4,
  dataClassification: "preliminary_assumption",
  notes: "Preset predefinido para contenedores Sungrow ST2752UX y PCS SC5000UD-MV. Nota: SC5000UD-MV integra transformador BT/MT y no se debe crear transformador separado.",
  supportedDurations: [2, 4, 8, 16],
  ratioByDuration: {
    2: 4,
    4: 8,
    8: 16,
    16: 32,
  },
};

export function getDefaultSmartSiteFitPreset(): SmartSiteFitPreset {
  return SUNGROW_ST2752UX_SC5000UD_PRESET;
}

export function getContainersPerPcsForDuration(durationHours: number): number {
  if (durationHours <= 2) {
    return 4;
  }
  if (durationHours <= 4) {
    return 8;
  }
  if (durationHours <= 8) {
    return 16;
  }
  if (durationHours <= 16) {
    return 32;
  }
  // Otherwise, scale proportionally: 2 BESS per hour of duration, min 1
  return Math.max(1, Math.round(durationHours * 2));
}

export function adjustPresetForDuration(
  preset: SmartSiteFitPreset,
  durationHours: number
): SmartSiteFitPreset {
  return {
    ...preset,
    defaultDurationHours: durationHours,
    notes: `${preset.notes} Ajustado para duración de ${durationHours}h con ratio de ${getContainersPerPcsForDuration(durationHours)} BESS por PCS.`,
  };
}
