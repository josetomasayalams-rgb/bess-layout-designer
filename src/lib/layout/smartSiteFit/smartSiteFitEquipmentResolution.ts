import { equipmentCatalog } from "@/data/equipmentCatalog";
import type { SmartSiteFitPreset } from "./smartSiteFitTypes";
import { getContainersPerPcsForDuration } from "./smartSiteFitPresets";

/**
 * Preset-driven equipment resolution for separate-PCS (BESS + PCS/MV)
 * architectures.
 *
 * SmartSiteFit historically hardcoded the Sungrow ST2752UX / SC5000UD-MV ids,
 * footprints and the 4/8/16/32 BESS-per-PCS schedule directly in the candidate
 * and shape generators. This module makes those values come from the active
 * preset + catalog instead, so a second separate-PCS manufacturer honors its own
 * datasheet dimensions and ratio rather than silently placing Sungrow equipment.
 *
 * All values are preliminary pre-dimensioning approximations. Footprints/ratings
 * are read from `equipmentCatalog`; Sungrow values fall back in only when a
 * referenced spec id is absent from the catalog, so the engine never divides by
 * zero nor places a zero-area rectangle.
 */

export interface EquipmentFootprint {
  length_m: number;
  width_m: number;
}

export interface SeparatePcsEquipment {
  bessSpecId: string;
  pcsSpecId: string;
  bess: EquipmentFootprint;
  pcs: EquipmentFootprint;
  /** Energy per battery container (MWh DC BOL), for target-MWh sizing. */
  energyPerBessMWh: number;
  /** Apparent power per PCS/MV station (MW proxy), for target-MW sizing. */
  powerPerPcsMW: number;
  /** BESS containers per PCS for the requested design duration. */
  containersPerPcs: number;
}

// Sungrow defaults mirrored from the catalog (see src/data/equipmentCatalog.ts).
// Used only as a safe fallback when a preset references a spec id not present in
// the catalog. The live Sungrow path resolves identical values from the catalog.
const SUNGROW_BESS_FOOTPRINT: EquipmentFootprint = { length_m: 9.34, width_m: 1.73 };
const SUNGROW_PCS_FOOTPRINT: EquipmentFootprint = { length_m: 6.058, width_m: 2.438 };
const SUNGROW_BESS_ENERGY_MWH = 2.752;
const SUNGROW_PCS_POWER_MW = 5;

// O(1) spec lookup shared by the resolver.
const specById = new Map(equipmentCatalog.map((s) => [s.id, s]));

/**
 * Resolve the BESS-per-PCS ratio for a design duration, preferring the preset's
 * own `ratioByDuration` table (exact match, then nearest supported duration) and
 * falling back to the shared duration heuristic when the preset has no table.
 * This lets a second separate-PCS manufacturer ship its own ratio instead of
 * inheriting Sungrow's 4/8/16/32 schedule.
 */
export function resolveContainersPerPcs(
  preset: SmartSiteFitPreset,
  durationHours: number
): number {
  const table = preset.ratioByDuration;
  if (table) {
    const exact = table[durationHours];
    if (exact !== undefined && exact > 0) return exact;
    const durations = Object.keys(table)
      .map(Number)
      .filter((d) => !Number.isNaN(d) && (table[d] ?? 0) > 0);
    if (durations.length > 0) {
      const nearest = durations.reduce((best, d) =>
        Math.abs(d - durationHours) < Math.abs(best - durationHours) ? d : best
      );
      const ratio = table[nearest];
      if (ratio !== undefined && ratio > 0) return ratio;
    }
  }
  return getContainersPerPcsForDuration(durationHours);
}

/**
 * Resolve the battery + PCS/MV equipment a separate-PCS preset models, reading
 * footprints and ratings from the catalog so a non-Sungrow preset honors its own
 * datasheet. For the default Sungrow preset this reproduces the legacy hardcoded
 * footprints (9.34 x 1.73, 6.058 x 2.438), energy (2.752 MWh) and power (5 MVA)
 * exactly, because the catalog carries those values.
 */
export function resolveSeparatePcsEquipment(
  preset: SmartSiteFitPreset,
  durationHours: number
): SeparatePcsEquipment {
  const bessSpec = specById.get(preset.bessSpecId);
  const pcsSpec = specById.get(preset.pcsSpecId);
  return {
    bessSpecId: preset.bessSpecId,
    pcsSpecId: preset.pcsSpecId,
    bess: {
      length_m: bessSpec?.footprint.length_m ?? SUNGROW_BESS_FOOTPRINT.length_m,
      width_m: bessSpec?.footprint.width_m ?? SUNGROW_BESS_FOOTPRINT.width_m,
    },
    pcs: {
      length_m: pcsSpec?.footprint.length_m ?? SUNGROW_PCS_FOOTPRINT.length_m,
      width_m: pcsSpec?.footprint.width_m ?? SUNGROW_PCS_FOOTPRINT.width_m,
    },
    energyPerBessMWh:
      bessSpec?.electrical?.energy_mwh_dc_bol ?? SUNGROW_BESS_ENERGY_MWH,
    powerPerPcsMW: pcsSpec?.electrical?.apparent_power_mva ?? SUNGROW_PCS_POWER_MW,
    containersPerPcs: resolveContainersPerPcs(preset, durationHours),
  };
}
