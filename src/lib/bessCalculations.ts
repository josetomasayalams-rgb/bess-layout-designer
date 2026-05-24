import type { PlacedEquipment } from "@/types/equipment";
import type { EquipmentSpec } from "@/data/equipmentCatalog";
import type {
  BessModel,
  BessParkSummary,
  BessRawModel,
  BessSizingInput,
  BessSizingResult,
} from "@/types/bess";

const TOLERANCE = 0.15;

export function roundMetric(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function differsByMoreThanTolerance(a: number, b: number): boolean {
  if (b === 0) return a !== 0;
  return Math.abs(a - b) / Math.abs(b) > TOLERANCE;
}

function commercialDurationFromName(product: string): number | null {
  const match = product.match(/(?:^|[^0-9])(\d+(?:\.\d+)?)\s*h(?:[^a-z]|$)/i);
  return match ? Number(match[1]) : null;
}

export function createBessModel(raw: BessRawModel): BessModel {
  const warnings: string[] = [];

  if (raw.lengthM <= 0 || raw.widthM <= 0 || raw.heightM <= 0) {
    warnings.push("Physical dimensions must be greater than zero.");
  }
  if (raw.energyMWh !== null && raw.energyMWh <= 0) {
    warnings.push("Energy must be greater than zero.");
  }
  if (raw.powerMW !== null && raw.powerMW <= 0) {
    warnings.push("Power must be greater than zero when available.");
  }
  if (raw.weightT !== null && raw.weightT <= 0) {
    warnings.push("Weight must be greater than zero when available.");
  }

  const areaM2 = roundMetric(raw.lengthM * raw.widthM, 2);
  const volumeM3 = roundMetric(raw.lengthM * raw.widthM * raw.heightM, 2);
  const durationHours =
    raw.energyMWh !== null && raw.powerMW !== null
      ? roundMetric(raw.energyMWh / raw.powerMW, 2)
      : raw.declaredDurationHours ?? null;
  const energyDensityMWhPerM2 =
    raw.energyMWh !== null ? roundMetric(raw.energyMWh / areaM2, 3) : null;
  const energyDensityMWhPerM3 =
    raw.energyMWh !== null ? roundMetric(raw.energyMWh / volumeM3, 3) : null;
  const powerDensityMWPerM2 =
    raw.powerMW !== null ? roundMetric(raw.powerMW / areaM2, 3) : null;
  const weightPerMWh =
    raw.weightT !== null && raw.energyMWh !== null
      ? roundMetric(raw.weightT / raw.energyMWh, 2)
      : null;
  const areaPerMWh =
    raw.energyMWh !== null ? roundMetric(areaM2 / raw.energyMWh, 2) : null;

  if (raw.declaredAreaM2 && differsByMoreThanTolerance(areaM2, raw.declaredAreaM2)) {
    warnings.push("Declared area differs from calculated footprint by more than 15%.");
  }
  if (raw.declaredVolumeM3 && differsByMoreThanTolerance(volumeM3, raw.declaredVolumeM3)) {
    warnings.push("Declared volume differs from calculated volume by more than 15%.");
  }
  if (
    raw.declaredDurationHours &&
    durationHours !== null &&
    differsByMoreThanTolerance(durationHours, raw.declaredDurationHours)
  ) {
    warnings.push("Calculated duration differs from declared duration by more than 15%.");
  }

  const commercialDuration = commercialDurationFromName(raw.product);
  if (
    commercialDuration !== null &&
    durationHours !== null &&
    differsByMoreThanTolerance(durationHours, commercialDuration)
  ) {
    warnings.push(
      "Calculated duration does not match the duration indicated in the product name."
    );
  }

  if (raw.powerMW === null) {
    warnings.push(
      "Rated power is not available. Equivalent duration and total power cannot be calculated precisely."
    );
  }
  if (raw.weightT === null) {
    warnings.push("Weight is not available. Total project weight will exclude this model.");
  }
  if (raw.dataConfidence === "estimated" || raw.dataConfidence === "requires_validation") {
    warnings.push("Data is estimated or requires validation with official datasheet or manufacturer.");
  }
  if (!raw.coolingType) {
    warnings.push("Cooling type is not registered. Confirm thermal design with manufacturer.");
  }
  if (raw.certifications.length === 0) {
    warnings.push(
      "Certifications are not registered. Confirm UL 9540, UL 9540A, IEC 62619, IEC 62933 or other applicable standards."
    );
  }
  if (!raw.chemistry || raw.chemistry.toLowerCase().includes("likely")) {
    warnings.push("Battery chemistry is not fully confirmed. Validate for safety and code review.");
  }
  warnings.push(
    "Manufacturer-specific spacing is not registered. Conservative regulatory spacing will be applied."
  );
  warnings.push(
    "Preliminary sizing only. Does not replace detailed engineering, manufacturer review or permitting."
  );

  return {
    ...raw,
    durationHours,
    areaM2,
    volumeM3,
    energyDensityMWhPerM2,
    energyDensityMWhPerM3,
    powerDensityMWPerM2,
    weightPerMWh,
    areaPerMWh,
    warnings,
  };
}

export function bessEquipmentSpecId(modelId: string): string {
  return `bess-${modelId}`;
}

export function modelIdFromEquipmentSpecId(specId: string): string | null {
  return specId.startsWith("bess-") ? specId.slice(5) : null;
}

export function bessModelByEquipmentSpecId(
  specId: string,
  models: BessModel[]
): BessModel | undefined {
  const modelId = modelIdFromEquipmentSpecId(specId);
  return modelId ? models.find((model) => model.id === modelId) : undefined;
}

export function computeBessParkSummary(
  placed: PlacedEquipment[],
  catalog: EquipmentSpec[],
  layoutAreaM2: number | null,
  options: { regulatoryBufferM: number; maintenanceBufferM: number }
): BessParkSummary {
  let energyTotalMWh = 0;
  let powerTotalMW = 0;
  let totalWeightT = 0;
  let footprintAreaM2 = 0;
  let regulatoryAreaM2 = 0;
  let maintenanceAreaM2 = 0;
  let hasUnknownPower = false;
  let hasUnknownWeight = false;
  const byManufacturer: Record<string, number> = {};
  const byModel: Record<string, number> = {};
  const byChemistry: Record<string, number> = {};
  const contributionByEnergy: Record<string, number> = {};
  const contributionByPower: Record<string, number> = {};

  for (const item of placed) {
    const spec = catalog.find((entry) => entry.id === item.equipmentSpecId);
    if (!spec || spec.type !== "battery_container") continue;

    const energy = spec.electrical?.energy_mwh_dc_bol ?? 0;
    const power = spec.electrical?.apparent_power_mva ?? null;
    const weightT = spec.mass ? spec.mass.weight_kg / 1000 : null;
    const chemistry = spec.environmental?.protection?.includes("chemistry:")
      ? spec.environmental.protection.split("chemistry:")[1]?.trim()
      : null;

    energyTotalMWh += energy;
    if (power === null) hasUnknownPower = true;
    else powerTotalMW += power;
    if (weightT === null) hasUnknownWeight = true;
    else totalWeightT += weightT;

    const area = spec.footprint.length_m * spec.footprint.width_m;
    footprintAreaM2 += area;
    regulatoryAreaM2 +=
      (spec.footprint.length_m + options.regulatoryBufferM * 2) *
      (spec.footprint.width_m + options.regulatoryBufferM * 2);
    maintenanceAreaM2 +=
      (spec.footprint.length_m + options.maintenanceBufferM * 2) *
      (spec.footprint.width_m + options.maintenanceBufferM * 2);

    byManufacturer[spec.manufacturer] = (byManufacturer[spec.manufacturer] ?? 0) + 1;
    byModel[spec.model] = (byModel[spec.model] ?? 0) + 1;
    if (chemistry) byChemistry[chemistry] = (byChemistry[chemistry] ?? 0) + 1;
    contributionByEnergy[spec.model] = (contributionByEnergy[spec.model] ?? 0) + energy;
    contributionByPower[spec.model] = (contributionByPower[spec.model] ?? 0) + (power ?? 0);
  }

  const topFrom = (values: Record<string, number>) =>
    Object.entries(values).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  const warnings: string[] = [];
  if (hasUnknownPower) {
    warnings.push("Total power and equivalent duration exclude units without validated power.");
  }
  if (hasUnknownWeight) {
    warnings.push("Total weight excludes units without validated weight.");
  }
  if (totalWeightT > 0) {
    warnings.push("Reference weight only. Foundation design requires civil engineering review.");
  }

  return {
    containerCount: Object.values(byModel).reduce((sum, count) => sum + count, 0),
    energyTotalMWh,
    powerTotalMW,
    durationEquivalentHours:
      powerTotalMW > 0 ? roundMetric(energyTotalMWh / powerTotalMW, 2) : null,
    totalWeightT,
    footprintAreaM2,
    regulatoryAreaM2,
    maintenanceAreaM2,
    layoutEnergyDensityMWhPerHa:
      layoutAreaM2 && layoutAreaM2 > 0
        ? roundMetric(energyTotalMWh / (layoutAreaM2 / 10000), 2)
        : null,
    layoutPowerDensityMWPerHa:
      layoutAreaM2 && layoutAreaM2 > 0
        ? roundMetric(powerTotalMW / (layoutAreaM2 / 10000), 2)
        : null,
    byManufacturer,
    byModel,
    predominantChemistry: topFrom(byChemistry),
    topEnergyModel: topFrom(contributionByEnergy),
    topPowerModel: topFrom(contributionByPower),
    weightPerMWhProject:
      energyTotalMWh > 0 && totalWeightT > 0
        ? roundMetric(totalWeightT / energyTotalMWh, 2)
        : null,
    areaPerMWhProject:
      energyTotalMWh > 0 ? roundMetric(footprintAreaM2 / energyTotalMWh, 2) : null,
    hasUnknownPower,
    hasUnknownWeight,
    warnings,
  };
}

export function calculateQuickSizing(
  input: BessSizingInput,
  models: BessModel[]
): BessSizingResult | null {
  const model = models.find((item) => item.id === input.modelId);
  if (!model || model.energyMWh === null) return null;

  const requiredUnitsByEnergy = Math.ceil(input.targetEnergyMWh / model.energyMWh);
  const requiredUnitsByPower =
    model.powerMW === null ? null : Math.ceil(input.targetPowerMW / model.powerMW);
  const requiredUnits = Math.max(requiredUnitsByEnergy, requiredUnitsByPower ?? 0);
  const installedEnergyMWh = requiredUnits * model.energyMWh;
  const installedPowerMW = model.powerMW === null ? null : requiredUnits * model.powerMW;
  const { rows, columns, layoutAreaM2 } = compactMatrixArea(
    requiredUnits,
    model.lengthM,
    model.widthM,
    input.separationM,
    input.mode
  );

  const warnings = [...model.warnings];
  if (model.powerMW === null) {
    warnings.push("Power sizing cannot be completed because the selected model has no rated MW.");
  }
  if (input.availableAreaM2 !== null && layoutAreaM2 > input.availableAreaM2) {
    warnings.push("Preliminary matrix exceeds the available area entered by the user.");
  }

  return {
    model,
    requiredUnitsByEnergy,
    requiredUnitsByPower,
    requiredUnits,
    installedEnergyMWh,
    installedPowerMW,
    energyOversizePercent:
      ((installedEnergyMWh - input.targetEnergyMWh) / input.targetEnergyMWh) * 100,
    powerOversizePercent:
      installedPowerMW === null
        ? null
        : ((installedPowerMW - input.targetPowerMW) / input.targetPowerMW) * 100,
    totalWeightT: model.weightT === null ? null : requiredUnits * model.weightT,
    physicalAreaM2: requiredUnits * model.areaM2,
    layoutAreaM2,
    rows,
    columns,
    fitsAvailableArea:
      input.availableAreaM2 === null ? null : layoutAreaM2 <= input.availableAreaM2,
    warnings,
  };
}

function compactMatrixArea(
  quantity: number,
  lengthM: number,
  widthM: number,
  separationM: number,
  mode: BessSizingInput["mode"]
) {
  const corridorFactor = mode === "wide_aisles" ? 1.35 : mode === "maintenance_priority" ? 1.2 : 1;
  let best = { rows: 1, columns: quantity, layoutAreaM2: Number.POSITIVE_INFINITY };
  for (let rows = 1; rows <= quantity; rows++) {
    const columns = Math.ceil(quantity / rows);
    const totalLength = columns * lengthM + (columns - 1) * separationM;
    const totalWidth = rows * widthM + (rows - 1) * separationM * corridorFactor;
    const layoutAreaM2 = totalLength * totalWidth;
    const score =
      mode === "regular"
        ? layoutAreaM2 * (1 + Math.abs(columns - rows) / Math.max(columns, rows))
        : layoutAreaM2;
    if (score < best.layoutAreaM2) best = { rows, columns, layoutAreaM2 };
  }
  return best;
}

export function rankBessModels(
  models: BessModel[],
  priority:
    | "mwh_per_m2"
    | "mw_per_m2"
    | "min_units"
    | "min_weight"
    | "min_area"
    | "format_20ft"
    | "format_40ft"
    | "lfp"
    | "confirmed"
    | "duration_2h"
    | "duration_4h"
    | "high_power"
    | "high_energy"
): BessModel[] {
  const filtered = models.filter((model) => {
    if (priority === "format_20ft") return model.containerFormat === "20ft";
    if (priority === "format_40ft") return model.containerFormat === "40ft";
    if (priority === "lfp") return model.chemistry?.toLowerCase().includes("lfp");
    if (priority === "confirmed") {
      return model.dataConfidence === "confirmed" || model.dataConfidence === "calculated";
    }
    return true;
  });

  const value = (model: BessModel) => {
    if (priority === "mwh_per_m2") return model.energyDensityMWhPerM2 ?? -1;
    if (priority === "mw_per_m2") return model.powerDensityMWPerM2 ?? -1;
    if (priority === "min_units") return model.energyMWh ?? -1;
    if (priority === "min_weight") return model.weightPerMWh ? -model.weightPerMWh : -999;
    if (priority === "min_area") return model.areaPerMWh ? -model.areaPerMWh : -999;
    if (priority === "duration_2h") return -Math.abs((model.durationHours ?? 999) - 2);
    if (priority === "duration_4h") return -Math.abs((model.durationHours ?? 999) - 4);
    if (priority === "high_power") return model.powerMW ?? model.powerDensityMWPerM2 ?? -1;
    return model.energyMWh ?? -1;
  };

  return [...filtered].sort((a, b) => value(b) - value(a));
}
