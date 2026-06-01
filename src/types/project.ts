import type { LngLat, ProjectAnchor } from "./geometry";
import type { PlacedEquipment } from "./equipment";
import type { SourceReliability } from "@/data/equipmentCatalog";
import type { UnitSystemId } from "@/data/unitSystem";
import type {
  ElectricalCompatibilityIssue,
  LayoutAssumption,
  PendingDataItem,
  PowerEnergyBlock,
  PreliminarySizingResult,
  ProjectCaseStudy,
  ProjectDesignIntent,
  ProjectExclusion,
} from "@/types/technical";
import type { EvidenceRef, EvidencedValue } from "@/types/evidence";
import type {
  AuxiliaryServices,
  BESSBlock,
  ConversionStation,
  MainTransformer,
  MVBus,
  MVFeeder,
  POI,
  PPC,
  OperationalLimits,
  LossEstimate,
} from "@/types/electrical";
import type { CableRoute } from "@/types/cable";
import type { AccessRoad } from "@/types/road";
import type { FireSafetyZone } from "@/types/safety";

export type SiteArea = {
  area_m2: number;
  area_ha: number;
};

export type ProjectSummary = {
  battery_container_count: number;
  pcs_count: number;
  total_apparent_power_mva: number;
  total_energy_mwh_dc_bol: number;
  duration_hours_gross: number | null;
  site_area: SiteArea | null;
  occupied_area_m2: number;
  occupation_ratio: number | null;
  /**
   * True when the layout has no separate PCS/MV station but battery units that
   * carry their own AC power (integrated architecture, e.g. Tesla Megapack).
   * Lets the UI/report present an "integrated" architecture instead of a
   * misleading "0 PCS". Populated by computeSummary; conceptual only.
   */
  is_integrated_architecture?: boolean;
  /** Count of integrated AC units when is_integrated_architecture is true. */
  integrated_unit_count?: number;
};

export type ExportedQuantity = {
  value: number;
  unit: string;
  data_classification: SourceReliability;
  source_note?: string;
};

export type ExportedSummaryQuantities = {
  site_area_m2: ExportedQuantity | null;
  site_area_ha: ExportedQuantity | null;
  occupied_area_m2: ExportedQuantity;
  total_apparent_power_mva: ExportedQuantity;
  total_energy_mwh_dc_bol: ExportedQuantity;
  duration_hours_gross: ExportedQuantity | null;
  occupation_ratio_pct: ExportedQuantity | null;
};

export type ExportedEquipmentQuantities = {
  id: string;
  equipment_spec_id: string;
  data_classification: SourceReliability;
  source_note?: string;
  footprint: {
    length_m: ExportedQuantity;
    width_m: ExportedQuantity;
    height_m?: ExportedQuantity;
  };
  mass?: {
    weight_kg: ExportedQuantity;
    weight_t: ExportedQuantity;
  };
  electrical?: {
    energy_mwh_dc_bol?: ExportedQuantity;
    apparent_power_mva?: ExportedQuantity;
    dc_voltage_min_v?: ExportedQuantity;
    dc_voltage_max_v?: ExportedQuantity;
    lv_voltage_kv?: ExportedQuantity;
    mv_voltage_kv?: ExportedQuantity;
    frequency_hz?: ExportedQuantity;
    efficiency_converter_pct?: ExportedQuantity;
    efficiency_total_pct?: ExportedQuantity;
  };
  environmental?: {
    operating_temp_min_c?: ExportedQuantity;
    operating_temp_max_c?: ExportedQuantity;
    derating_above_c?: ExportedQuantity;
    humidity_min_pct?: ExportedQuantity;
    humidity_max_pct?: ExportedQuantity;
    max_altitude_m?: ExportedQuantity;
  };
};

/**
 * Objetivos de diseño del proyecto (Fase 1+).
 *
 * Distingue tres conceptos de energía:
 * - `usableEnergyCommercialMWh`: lo que se vende (declarada por el contrato).
 * - `grossEnergyMWh`: suma de container nameplate (BOL).
 * - `usableEnergyMWh`: real con DoD/degradación/EOL.
 * - `usableFactor` ∈ [0, 1] conecta bruto con usable.
 */
export type ProjectDesignTargets = {
  powerMW?: EvidencedValue<number>;
  usableEnergyCommercialMWh?: EvidencedValue<number>;
  grossEnergyMWh?: EvidencedValue<number>;
  usableEnergyMWh?: EvidencedValue<number>;
  usableFactor?: EvidencedValue<number>;
  durationHours?: number;
};

/** Inconsistencia documental detectada (ej. ST2752 vs ST2725). */
export type DocumentInconsistency = {
  id: string;
  topic: string;
  conflictingValues: Array<{
    value: string;
    evidence: EvidenceRef;
  }>;
  recommendation: string;
  resolvedValue?: string;
  resolvedBy?: EvidenceRef;
};

/** Supuesto preliminar editable, visible en reporte. */
export type ProjectAssumption = {
  id: string;
  description: string;
  value?: number | string | boolean;
  unit?: string;
  risk: "low" | "medium" | "high";
  mustVerifyBeforeIFC: boolean;
  evidence: EvidenceRef[];
};

/**
 * Resultado del motor regulatorio para el export v1.2 (Fase 10).
 *
 * Es una proyección plana del `RegulatoryEvaluationResult` interno,
 * pensada para serializar a JSON sin objetos cíclicos ni funciones.
 */
export type RegulatoryEvaluationExport = {
  profile_id: string;
  profile_name: string;
  evaluated_at: string;
  totals: {
    pass: number;
    violation: number;
    manual_check: number;
    pending: number;
    not_evaluable: number;
    out_of_scope: number;
    blocking_violations: number;
    warning_violations: number;
  };
  rules: Array<{
    rule_id: string;
    category: string;
    severity: string;
    title: string;
    outcome: string;
    violations: Array<{
      message: string;
      affected_ids?: string[];
      measured_m?: number;
      required_m?: number;
    }>;
    evidence: Array<{
      document_id: string;
      page?: number;
      section?: string;
      confidence: string;
      note?: string;
    }>;
  }>;
  document_registry_refs: string[];
};

/**
 * Capas eléctricas extendidas (Fase 1+).
 *
 * Todos los campos son opcionales o por defecto vacíos para mantener
 * retrocompatibilidad con proyectos v1.1.
 */
export type ProjectElectricalArchitecture = {
  blocks: BESSBlock[];
  conversionStations: ConversionStation[];
  mvFeeders: MVFeeder[];
  mvBuses: MVBus[];
  poi?: POI;
  mainTransformer?: MainTransformer;
  auxiliaryServices?: AuxiliaryServices;
  ppc?: PPC;
  operationalLimits?: OperationalLimits;
  lossEstimates?: LossEstimate[];
};

/** Capas físicas extendidas (Fase 1+). */
export type ProjectPhysicalLayout = {
  cableRoutes: CableRoute[];
  accessRoads: AccessRoad[];
  fireSafetyZones: FireSafetyZone[];
};

export type ExportedProject = {
  /**
   * Schema version. `"1.2"` introduce campos opcionales nuevos
   * (`design_targets`, capas eléctricas, capas físicas extendidas,
   * `assumptions_v2`, `inconsistencies`). El lector v1.2 acepta exports v1.1.
   */
  schema_version: "1.1" | "1.2";
  exported_at: string;
  unit_system: UnitSystemId;
  anchor: ProjectAnchor | null;
  polygon: LngLat[];
  placed_equipment: PlacedEquipment[];
  summary: ProjectSummary;
  summary_quantities: ExportedSummaryQuantities;
  placed_equipment_quantities: ExportedEquipmentQuantities[];
  warnings: { id: string; severity: string; message: string; reliability: string }[];
  designIntent?: ProjectDesignIntent;
  caseStudy?: ProjectCaseStudy;
  selectedEquipment?: PlacedEquipment[];
  powerEnergyBlocks?: PowerEnergyBlock[];
  sizingResult?: PreliminarySizingResult;
  electricalCompatibilityIssues?: ElectricalCompatibilityIssue[];
  layoutAssumptions?: LayoutAssumption[];
  pendingData?: PendingDataItem[];
  exclusions?: ProjectExclusion[];
  requiredNextStudies?: PendingDataItem[];
  conceptualScopeNote?: string;

  // ──────────────────────────────────────────────────────────────────
  // v1.2 — opcionales, defaults vacíos si vienen de un proyecto v1.1
  // ──────────────────────────────────────────────────────────────────
  design_targets?: ProjectDesignTargets;
  electrical_architecture?: ProjectElectricalArchitecture;
  physical_layout?: ProjectPhysicalLayout;
  assumptions_v2?: ProjectAssumption[];
  inconsistencies?: DocumentInconsistency[];
  /** IDs de documentos del DocumentRegistry referenciados en este export. */
  document_registry_refs?: string[];
  /** Fase 10 — evaluación del perfil regulatorio activo. */
  regulatory_evaluation?: RegulatoryEvaluationExport;
};
