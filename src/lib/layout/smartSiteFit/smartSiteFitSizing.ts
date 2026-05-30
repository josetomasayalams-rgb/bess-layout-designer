import { equipmentCatalog } from "@/data/equipmentCatalog";
import type { PlacedEquipment } from "@/types/equipment";
import type { SmartSiteFitPreset, SmartSiteFitWarning } from "./smartSiteFitTypes";
import {
  getDefaultSmartSiteFitPreset,
  getContainersPerPcsForDuration,
  isIntegratedPreset,
  resolveIntegratedUnitSpecId,
} from "./smartSiteFitPresets";

// O(1) spec lookup shared by the summarizer.
const specById = new Map(equipmentCatalog.map((s) => [s.id, s]));

export interface PlacedEquipmentSummary {
  bessCount: number;
  pcsCount: number;
  powerMW: number;
  energyMWh: number;
}

/**
 * Architecture-agnostic summary of a placed-equipment list, resolving ratings
 * from the catalog so it is correct for both Sungrow (separate BESS + PCS) and
 * Tesla (integrated units carrying both energy and power).
 *
 * - `energyMWh` is the sum of battery-container energy.
 * - `powerMW` is the sum of PCS apparent power when separate PCS exist;
 *   otherwise (integrated systems) the sum of the units' apparent power.
 *
 * For a Sungrow layout this reproduces the legacy `pcsCount × 5` / `bessCount ×
 * 2.752` figures exactly, since the catalog carries those ratings.
 */
export function summarizePlacedEquipment(
  placed: PlacedEquipment[]
): PlacedEquipmentSummary {
  let bessCount = 0;
  let pcsCount = 0;
  let batteryEnergyMWh = 0;
  let batteryPowerMW = 0;
  let pcsPowerMW = 0;
  for (const item of placed) {
    const spec = specById.get(item.equipmentSpecId);
    if (spec?.type === "pcs_mv_station") {
      pcsCount++;
      pcsPowerMW += spec.electrical?.apparent_power_mva ?? 0;
    } else if (spec?.type === "battery_container") {
      bessCount++;
      batteryEnergyMWh += spec.electrical?.energy_mwh_dc_bol ?? 0;
      batteryPowerMW += spec.electrical?.apparent_power_mva ?? 0;
    }
  }
  return {
    bessCount,
    pcsCount,
    powerMW: pcsCount > 0 ? pcsPowerMW : batteryPowerMW,
    energyMWh: batteryEnergyMWh,
  };
}

/**
 * Preliminary power/energy → equipment-count derivation.
 *
 * The SmartSiteFit micro-adjustments are expressed in approximate power (MW)
 * and energy (MWh) so users do not have to reason about container counts. The
 * engine still works in BESS/PCS counts, so this helper converts MW/MWh into a
 * defensible, integer count of Sungrow ST2752UX battery containers and
 * SC5000UD-MV PCS/MV stations.
 *
 * All results are preliminary pre-dimensioning approximations — the SC5000UD-MV
 * integrates its own LV/MV transformer, so no separate transformer is created.
 */

export interface DeriveEquipmentCountsInput {
  targetPowerMW?: number;
  targetEnergyMWh?: number;
  durationHours: number;
  preset?: SmartSiteFitPreset;
}

export interface DeriveEquipmentCountsResult {
  bessCount: number;
  pcsCount: number;
  effectivePowerMW: number;
  effectiveEnergyMWh: number;
  durationHours: number;
  warnings: SmartSiteFitWarning[];
}

/**
 * Approximate per-unit ratings used for preliminary conversion.
 *
 * For an integrated preset (Tesla) the "BESS unit" is the whole integrated
 * enclosure, which carries both energy and power; `pcsPowerMW` then represents
 * the per-unit power (there is no separate PCS).
 */
function presetUnitRatings(
  preset: SmartSiteFitPreset,
  durationHours: number
): {
  bessEnergyMWh: number;
  pcsPowerMW: number;
  integrated: boolean;
} {
  if (isIntegratedPreset(preset)) {
    const unitSpecId = resolveIntegratedUnitSpecId(preset, durationHours);
    const unitSpec = equipmentCatalog.find((s) => s.id === unitSpecId);
    return {
      bessEnergyMWh: unitSpec?.electrical?.energy_mwh_dc_bol ?? 3.916,
      pcsPowerMW: unitSpec?.electrical?.apparent_power_mva ?? 0.979,
      integrated: true,
    };
  }
  const bessSpec = equipmentCatalog.find((s) => s.id === preset.bessSpecId);
  const pcsSpec = equipmentCatalog.find((s) => s.id === preset.pcsSpecId);
  const bessEnergyMWh = bessSpec?.electrical?.energy_mwh_dc_bol ?? 2.752;
  // SC5000UD-MV ~5 MVA, used as a preliminary proxy for MW.
  const pcsPowerMW = pcsSpec?.electrical?.apparent_power_mva ?? 5;
  return { bessEnergyMWh, pcsPowerMW, integrated: false };
}

/**
 * Inverse helper: estimate approximate power/energy from an existing
 * BESS/PCS count, used to seed the MW/MWh micro-adjust inputs from the
 * currently selected alternative. Preliminary approximation.
 */
export function estimatePowerEnergyFromCounts(input: {
  bessCount: number;
  pcsCount: number;
  preset?: SmartSiteFitPreset;
  durationHours?: number;
}): { powerMW: number; energyMWh: number } {
  const preset = input.preset ?? getDefaultSmartSiteFitPreset();
  const duration = input.durationHours && input.durationHours > 0 ? input.durationHours : 4;
  const { bessEnergyMWh, pcsPowerMW, integrated } = presetUnitRatings(preset, duration);
  if (integrated) {
    // Integrated units carry both energy and power; power scales with the
    // number of units (bessCount), not a separate PCS count.
    const units = Math.max(0, input.bessCount);
    return { powerMW: units * pcsPowerMW, energyMWh: units * bessEnergyMWh };
  }
  return {
    powerMW: Math.max(0, input.pcsCount) * pcsPowerMW,
    energyMWh: Math.max(0, input.bessCount) * bessEnergyMWh,
  };
}

export function deriveEquipmentCountsFromPowerEnergy(
  input: DeriveEquipmentCountsInput
): DeriveEquipmentCountsResult {
  const preset = input.preset ?? getDefaultSmartSiteFitPreset();
  const durationHours = input.durationHours > 0 ? input.durationHours : 4;
  const { bessEnergyMWh, pcsPowerMW, integrated } = presetUnitRatings(preset, durationHours);

  if (integrated) {
    return deriveIntegratedUnitCounts(input, durationHours, bessEnergyMWh, pcsPowerMW);
  }

  const ratio = getContainersPerPcsForDuration(durationHours);
  const warnings: SmartSiteFitWarning[] = [];

  // Resolve power/energy, deriving the missing one from duration when needed.
  let powerMW = input.targetPowerMW;
  let energyMWh = input.targetEnergyMWh;
  if ((powerMW === undefined || powerMW <= 0) && energyMWh && energyMWh > 0) {
    powerMW = energyMWh / durationHours;
  }
  if ((energyMWh === undefined || energyMWh <= 0) && powerMW && powerMW > 0) {
    energyMWh = powerMW * durationHours;
  }
  // Final fallback: a small nonzero target so the engine always has a size.
  if (!powerMW || powerMW <= 0) powerMW = pcsPowerMW;
  if (!energyMWh || energyMWh <= 0) energyMWh = powerMW * durationHours;

  // Round up: enough PCS for the requested power, enough BESS for the energy.
  const pcsFromPower = Math.max(1, Math.ceil(powerMW / pcsPowerMW));
  const bessCount = Math.max(1, Math.ceil(energyMWh / bessEnergyMWh));
  const pcsFromEnergyRatio = Math.max(1, Math.ceil(bessCount / ratio));

  // The PCS count must satisfy both the power target and the BESS/PCS ratio.
  const pcsCount = Math.max(pcsFromPower, pcsFromEnergyRatio);

  if (pcsFromEnergyRatio > pcsFromPower) {
    warnings.push({
      id: "ssf-power-energy-ratio",
      severity: "warning",
      message:
        "La energia solicitada requiere mas contenedores que la potencia indicada; se aumento el numero de PCS/MV para mantener la proporcion preliminar. Resultado aproximado.",
    });
  }

  const effectivePowerMW = pcsCount * pcsPowerMW;
  const effectiveEnergyMWh = bessCount * bessEnergyMWh;

  // Flag a duration that is inconsistent with the requested power/energy.
  if (input.targetPowerMW && input.targetEnergyMWh) {
    const impliedDuration = input.targetEnergyMWh / input.targetPowerMW;
    if (
      impliedDuration > 0 &&
      Math.abs(impliedDuration - durationHours) / durationHours > 0.25
    ) {
      warnings.push({
        id: "ssf-duration-mismatch",
        severity: "info",
        message:
          "La relacion energia/potencia no coincide con la duracion seleccionada; se ajusto a la configuracion tecnica preliminar mas cercana.",
      });
    }
  }

  return {
    bessCount,
    pcsCount,
    effectivePowerMW,
    effectiveEnergyMWh,
    durationHours,
    warnings,
  };
}

/**
 * Integrated-architecture sizing (e.g. Tesla Megapack 2 XL).
 *
 * Each integrated unit carries both energy and power, so there is no separate
 * PCS and no BESS/PCS ratio. The unit count must satisfy BOTH the requested
 * power and energy; `pcsCount` is always 0. Preliminary approximation — the
 * external MV step-up transformer is not modeled and is surfaced as a warning
 * elsewhere.
 */
function deriveIntegratedUnitCounts(
  input: DeriveEquipmentCountsInput,
  durationHours: number,
  unitEnergyMWh: number,
  unitPowerMW: number
): DeriveEquipmentCountsResult {
  const warnings: SmartSiteFitWarning[] = [];

  // Resolve power/energy, deriving the missing one from duration when needed.
  let powerMW = input.targetPowerMW;
  let energyMWh = input.targetEnergyMWh;
  if ((powerMW === undefined || powerMW <= 0) && energyMWh && energyMWh > 0) {
    powerMW = energyMWh / durationHours;
  }
  if ((energyMWh === undefined || energyMWh <= 0) && powerMW && powerMW > 0) {
    energyMWh = powerMW * durationHours;
  }
  // Final fallback: a small nonzero target so the engine always has a size.
  if (!powerMW || powerMW <= 0) powerMW = unitPowerMW;
  if (!energyMWh || energyMWh <= 0) energyMWh = powerMW * durationHours;

  // Round up: enough integrated units to satisfy both power and energy.
  const unitsFromEnergy = Math.max(1, Math.ceil(energyMWh / unitEnergyMWh));
  const unitsFromPower = Math.max(1, Math.ceil(powerMW / unitPowerMW));
  const bessCount = Math.max(unitsFromEnergy, unitsFromPower);

  const effectivePowerMW = bessCount * unitPowerMW;
  const effectiveEnergyMWh = bessCount * unitEnergyMWh;

  // Flag a duration that is inconsistent with the requested power/energy.
  if (input.targetPowerMW && input.targetEnergyMWh) {
    const impliedDuration = input.targetEnergyMWh / input.targetPowerMW;
    if (
      impliedDuration > 0 &&
      Math.abs(impliedDuration - durationHours) / durationHours > 0.25
    ) {
      warnings.push({
        id: "ssf-duration-mismatch",
        severity: "info",
        message:
          "La relacion energia/potencia no coincide con la duracion seleccionada; se ajusto a la configuracion tecnica preliminar mas cercana.",
      });
    }
  }

  return {
    bessCount,
    pcsCount: 0,
    effectivePowerMW,
    effectiveEnergyMWh,
    durationHours,
    warnings,
  };
}
