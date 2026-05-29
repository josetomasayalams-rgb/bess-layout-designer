import { equipmentCatalog } from "@/data/equipmentCatalog";
import type { SmartSiteFitPreset, SmartSiteFitWarning } from "./smartSiteFitTypes";
import { getDefaultSmartSiteFitPreset, getContainersPerPcsForDuration } from "./smartSiteFitPresets";

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

/** Approximate per-unit ratings used for preliminary conversion. */
function presetUnitRatings(preset: SmartSiteFitPreset): {
  bessEnergyMWh: number;
  pcsPowerMW: number;
} {
  const bessSpec = equipmentCatalog.find((s) => s.id === preset.bessSpecId);
  const pcsSpec = equipmentCatalog.find((s) => s.id === preset.pcsSpecId);
  const bessEnergyMWh = bessSpec?.electrical?.energy_mwh_dc_bol ?? 2.752;
  // SC5000UD-MV ~5 MVA, used as a preliminary proxy for MW.
  const pcsPowerMW = pcsSpec?.electrical?.apparent_power_mva ?? 5;
  return { bessEnergyMWh, pcsPowerMW };
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
}): { powerMW: number; energyMWh: number } {
  const preset = input.preset ?? getDefaultSmartSiteFitPreset();
  const { bessEnergyMWh, pcsPowerMW } = presetUnitRatings(preset);
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
  const { bessEnergyMWh, pcsPowerMW } = presetUnitRatings(preset);
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
