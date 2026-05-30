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
  architecture: "bess_plus_pcs",
  ratioByDuration: {
    2: 4,
    4: 8,
    8: 16,
    16: 32,
  },
};

/**
 * Tesla Megapack 2 XL — integrated AC-coupled block (battery + bidirectional
 * inverter/PCS + thermal management) in a single enclosure. There is no
 * separate PCS and no BESS/PCS ratio: each unit is sized as a whole.
 *
 * Catalog data comes from src/data/bessModels.ts (datasheet-derived). The unit
 * spec differs by duration because energy/power are configured per duration:
 *   2h → bess-tesla-megapack-2xl-2h (3.854 MWh / 1.927 MW)
 *   4h → bess-tesla-megapack-2xl-4h (3.916 MWh / 0.979 MW)
 *
 * The unit outputs low-voltage AC; connection to medium voltage requires an
 * external step-up transformer that is NOT modeled here (requires technical
 * review). This preset never creates a separate PCS/MV station or transformer.
 */
export const TESLA_MEGAPACK_2XL_PRESET: SmartSiteFitPreset = {
  id: "tesla-megapack-2xl",
  name: "Tesla Megapack 2 XL (integrado)",
  // Default to the 4h unit; the engine re-resolves the unit by design duration.
  bessSpecId: "bess-tesla-megapack-2xl-4h",
  pcsSpecId: "", // integrado: sin PCS/MV separado
  bessPerPcs2h: 1,
  bessPerPcs4h: 1,
  defaultDurationHours: 4,
  dataClassification: "preliminary_assumption",
  notes:
    "Preset preliminar Tesla Megapack 2 XL: bloque AC integrado (batería + inversor bidireccional + gestión térmica). No usa PCS/MV separado ni transformador separado. La conexión a media tensión requiere un transformador elevador externo no incluido (requiere revisión técnica).",
  supportedDurations: [2, 4],
  architecture: "integrated",
  integratedUnitSpecByDuration: {
    2: "bess-tesla-megapack-2xl-2h",
    4: "bess-tesla-megapack-2xl-4h",
  },
};

/** All BESS-system presets selectable in SmartSiteFit. */
export const SMART_SITE_FIT_PRESETS: SmartSiteFitPreset[] = [
  SUNGROW_ST2752UX_SC5000UD_PRESET,
  TESLA_MEGAPACK_2XL_PRESET,
];

export function getDefaultSmartSiteFitPreset(): SmartSiteFitPreset {
  return SUNGROW_ST2752UX_SC5000UD_PRESET;
}

/** Resolve a preset by id, falling back to the default Sungrow preset. */
export function getSmartSiteFitPresetById(id?: string | null): SmartSiteFitPreset {
  if (!id) return getDefaultSmartSiteFitPreset();
  return (
    SMART_SITE_FIT_PRESETS.find((p) => p.id === id) ?? getDefaultSmartSiteFitPreset()
  );
}

/** True when the preset models a single integrated unit (no separate PCS). */
export function isIntegratedPreset(preset: SmartSiteFitPreset): boolean {
  return preset.architecture === "integrated";
}

/**
 * Resolve the integrated-unit catalog spec id for a given design duration.
 * Falls back to the nearest supported duration, then to the preset's bessSpecId.
 */
export function resolveIntegratedUnitSpecId(
  preset: SmartSiteFitPreset,
  durationHours: number
): string {
  const map = preset.integratedUnitSpecByDuration;
  if (!map) return preset.bessSpecId;
  if (map[durationHours]) return map[durationHours];
  const durations = Object.keys(map)
    .map(Number)
    .filter((d) => !Number.isNaN(d));
  if (durations.length === 0) return preset.bessSpecId;
  const nearest = durations.reduce((best, d) =>
    Math.abs(d - durationHours) < Math.abs(best - durationHours) ? d : best
  );
  return map[nearest] ?? preset.bessSpecId;
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
