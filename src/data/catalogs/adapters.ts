import type { EquipmentSpec } from "@/data/equipmentCatalog";
import type {
  BessContainerSpec,
  DataClassification,
  MvSkidSpec,
  PcsSpec,
  TransformerSpec,
} from "@/types/technical";

function sourceNotes(
  classification: DataClassification,
  title: string,
  notes?: string
) {
  return {
    reliability: classification,
    title,
    notes: notes ?? "",
  };
}

export function bessContainerToEquipmentSpec(
  spec: BessContainerSpec
): EquipmentSpec {
  const source = spec.nominalEnergyMWhDcBol?.source ?? spec.sources[0];
  return {
    id: spec.id,
    type: "battery_container",
    manufacturer: spec.manufacturer,
    model: spec.model,
    label: `${spec.manufacturer} ${spec.model}`,
    footprint: {
      length_m: spec.footprint.lengthM.value,
      width_m: spec.footprint.widthM.value,
      height_m: spec.footprint.heightM?.value,
    },
    mass: spec.weightKg ? { weight_kg: spec.weightKg.value } : undefined,
    electrical: {
      energy_mwh_dc_bol: spec.nominalEnergyMWhDcBol?.value,
      dc_voltage_min_v: spec.dcVoltageRange?.min,
      dc_voltage_max_v: spec.dcVoltageRange?.max,
    },
    environmental: {
      cooling: spec.cooling?.value,
      protection: `${spec.protection?.value ?? "protection:pending"}; chemistry:${
        spec.chemistry?.value ?? "unknown"
      }`,
    },
    source: sourceNotes(
      source.classification,
      source.title,
      `${source.notes ?? ""} Clearances: ${spec.clearances.status}. ${spec.clearances.notes}`
    ),
  };
}

export function pcsToEquipmentSpec(spec: PcsSpec): EquipmentSpec | null {
  if (!spec.footprint) return null;
  const source = spec.apparentPowerMva?.source ?? spec.sources[0];
  return {
    id: spec.id,
    type: "pcs_mv_station",
    manufacturer: spec.manufacturer,
    model: spec.model,
    label: `${spec.manufacturer} ${spec.model}`,
    footprint: {
      length_m: spec.footprint.lengthM.value,
      width_m: spec.footprint.widthM.value,
      height_m: spec.footprint.heightM?.value,
    },
    mass: spec.weightKg ? { weight_kg: spec.weightKg.value } : undefined,
    electrical: {
      apparent_power_mva: spec.apparentPowerMva?.value,
      dc_voltage_min_v: spec.dcVoltageRange?.min,
      dc_voltage_max_v: spec.dcVoltageRange?.max,
      lv_voltage_kv: spec.acLvVoltageKv?.value,
      mv_voltage_kv: spec.acMvVoltageKv?.value,
      frequency_hz: spec.frequencyHz?.value,
      efficiency_converter_pct: spec.efficiencyConverterPct?.value,
      efficiency_total_pct: spec.efficiencyIncludingTransformerPct?.value,
    },
    environmental: {
      cooling: spec.cooling?.value,
    },
    source: sourceNotes(
      source.classification,
      source.title,
      `${source.notes ?? ""} ${
        spec.knownVoltageContradictions
          ? `Voltage discrepancy to validate: ${spec.knownVoltageContradictions.notes}`
          : ""
      }`
    ),
  };
}

export function mvSkidToEquipmentSpec(spec: MvSkidSpec): EquipmentSpec | null {
  if (!spec.footprint) return null;
  const source = spec.apparentPowerMva?.source ?? spec.sources[0];
  return {
    id: spec.id,
    type: "pcs_mv_station",
    manufacturer: spec.manufacturer,
    model: spec.model,
    label: `${spec.manufacturer} ${spec.model}`,
    footprint: {
      length_m: spec.footprint.lengthM.value,
      width_m: spec.footprint.widthM.value,
      height_m: spec.footprint.heightM?.value,
    },
    mass: spec.weightKg ? { weight_kg: spec.weightKg.value } : undefined,
    electrical: {
      apparent_power_mva: spec.apparentPowerMva?.value,
      lv_voltage_kv: spec.lvVoltageKv?.value,
      mv_voltage_kv: spec.mvVoltageKv?.value,
    },
    source: sourceNotes(
      source.classification,
      source.title,
      "Conceptual visual adapter for PCS/MV conversion center. Use technical catalog for engineering fields."
    ),
  };
}

export function transformerToEquipmentSpec(
  spec: TransformerSpec
): EquipmentSpec | null {
  const length = spec.footprint?.lengthM?.value;
  const width = spec.footprint?.widthM?.value;
  if (!length || !width) return null;
  const source = spec.apparentPowerMva?.source ?? spec.sources[0];
  return {
    id: spec.id,
    type: "mv_transformer",
    manufacturer: spec.manufacturer ?? "Unknown",
    model: spec.model ?? spec.role,
    label: `${spec.manufacturer ?? "Transformer"} ${spec.model ?? spec.role}`,
    footprint: {
      length_m: length,
      width_m: width,
      height_m: spec.footprint?.heightM?.value,
    },
    mass: spec.weightKg ? { weight_kg: spec.weightKg.value } : undefined,
    electrical: {
      apparent_power_mva: spec.apparentPowerMva?.value,
      lv_voltage_kv: spec.lvVoltageKv?.value,
      mv_voltage_kv: spec.mvVoltageKv?.value,
    },
    environmental: {
      cooling: spec.cooling?.value,
    },
    source: sourceNotes(
      source.classification,
      source.title,
      "Conceptual transformer adapter. Main 220 kV transformer is intentionally excluded from the current layout scope."
    ),
  };
}
