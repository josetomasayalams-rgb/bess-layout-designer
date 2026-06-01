/**
 * Ensamblador de datos para el reporte PDF (Fase 11).
 *
 * Toma todo el estado relevante del proyecto y produce un objeto serializable
 * que el componente `<ReportDocument />` consume para renderizar el PDF.
 *
 * El objetivo es separar "qué datos" de "cómo se ven": esta función no sabe
 * nada de react-pdf. Tests y reportes alternativos pueden reusarla.
 */

import { equipmentCatalog } from "@/data/equipmentCatalog";
import { generateConceptualPhysicalInfrastructure } from "@/lib/layout/physicalInfrastructure";
import {
  DEFAULT_STATIONS_PER_FEEDER,
  DEFAULT_USABLE_FACTOR,
  computeArchitectureSizing,
} from "@/lib/sizing/architectureSizing";
import { polygonAreaFromLngLat } from "@/lib/geometry/area";
import {
  formatCoordinatesBundle,
  type CoordinateFormatsBundle,
} from "@/lib/report/coordinateFormats";
import {
  describeLocation,
  type ReverseGeocodeResult,
} from "@/lib/report/reverseGeocode";
import { buildSiteSvg, type SiteSvgModel } from "@/lib/report/buildSiteSvg";
import type { MapCaptureResult } from "@/lib/report/captureMap";
import type {
  AuxiliaryServices,
  ConversionStation,
  LossEstimate,
  MainTransformer,
  MVBus,
  MVFeeder,
  OperationalLimits,
  POI,
  PPC,
} from "@/types/electrical";
import type {
  EvaluatedRuleEntry,
  RegulatoryEvaluationResult,
  RuleOutcome,
} from "@/rules/regulatoryProfileEvaluator";
import { isPhase8ElectricalRuleId } from "@/rules/regulatoryRulesCatalog";
import type { RuleSeverity } from "@/rules/types";
import { strongestCitedLevel } from "@/rules/severityCeiling";
import type { DocumentLevel } from "@/data/documentRegistry";
import type { PlacedEquipment } from "@/types/equipment";
import type { LngLat, ProjectAnchor } from "@/types/geometry";
import type {
  DocumentInconsistency,
  ProjectAssumption,
  ProjectDesignTargets,
} from "@/types/project";
import type { EvidencedValue } from "@/types/evidence";
import type {
  PendingDataItem,
  ProjectCaseStudy,
  ProjectExclusion,
} from "@/types/technical";
import {
  documentRegistry,
  findDocument,
  type DocumentRegistryEntry,
} from "@/data/documentRegistry";
import { disclaimerTexts } from "@/data/disclaimerTexts";
import { exclusionRegistry } from "@/data/exclusionRegistry";

export type ReportEquipmentRow = {
  type: string;
  manufacturer: string;
  model: string;
  count: number;
  lengthM: number;
  widthM: number;
  heightM?: number;
  weightKg?: number;
};

export type ReportStationRow = {
  id: string;
  manufacturer: string;
  model: string;
  ratedMVA: number;
  feederId?: string;
  containerCount: number;
};

export type ReportKpiSource = "documented_targets" | "layout_inventory" | "mixed";

export type ReportKpis = {
  source: ReportKpiSource;
  poiPowerMW: number | null;
  installedPowerMVA: number;
  commercialEnergyMWh: number | null;
  grossEnergyMWh: number;
  usableEnergyMWh: number;
  durationHours: number | null;
  containers: number;
  stations: number;
  feeders: number;
  blocks: number;
  buses: number;
  containersPerStation: number | null;
  /**
   * True when installed power comes from integrated AC units (no separate
   * PCS/MV station in the layout), e.g. Tesla Megapack. Conceptual only; the
   * external MV step-up transformer is not modeled.
   */
  isIntegrated: boolean;
  /** Count of integrated AC units when isIntegrated is true; otherwise 0. */
  integratedUnitCount: number;
};

export type ReportConsistencyAlert = {
  id: string;
  severity: "critical" | "warning" | "info";
  title: string;
  message: string;
  recommendation: string;
};

export type ReportLocation = {
  /** Centroide del polígono (lat/lng). */
  centroid: LngLat | null;
  formats: CoordinateFormatsBundle | null;
  /** Reverse geocoding opcional. Null si no se pudo. */
  geocode: ReverseGeocodeResult | null;
  /** Texto legible para portada (ej. "Santiago, RM, Chile"). */
  describedPlace: string | null;
};

export type ReportSiteMetrics = {
  /** Área m² del polígono. */
  areaM2: number;
  areaHa: number;
  /** Conteo de placedEquipment por tipo. */
  equipmentCounts: { type: string; count: number }[];
  /** Rectángulo envolvente (m local). */
  bbox: SiteSvgModel["bboxLocalM"] | null;
};

/**
 * One row of the "Preliminary electrical checks" report block (Fase 9).
 *
 * This block is the report-side view of the 8 Fase 8 electrical screening
 * rules already evaluated by the engine. It is intentionally narrower than
 * `EvaluatedRuleEntry`: only the data the PDF needs to render the table.
 */
export type ReportPreliminaryElectricalCheck = {
  ruleId: string;
  title: string;
  description: string;
  /** Severity after applying the `severityCeiling` matrix. */
  effectiveSeverity: RuleSeverity;
  /** Severity declared in the catalog, before the ceiling. */
  declaredSeverity: RuleSeverity;
  /** Strongest cited document level, when any. */
  documentLevel: DocumentLevel | null;
  /** Engine outcome (pass / violation / not_evaluable / …). */
  outcome: RuleOutcome;
  /** If severity was lowered by the matrix, the reason; otherwise null. */
  severityCappedBy: EvaluatedRuleEntry["severityCappedBy"];
  /** Short citation label like "Doc title · p.X · §Y" or null. */
  citation: string | null;
  /** Engine messages tied to this rule (empty when the rule passes). */
  violations: { message: string; affectedIds?: string[] }[];
};

export type ReportPreliminaryElectricalBlock = {
  /** All 8 Fase 8 checks visible in the active profile (may be empty). */
  checks: ReportPreliminaryElectricalCheck[];
  /** Outcome counts for the block (subset of the regulatory totals). */
  totals: {
    pass: number;
    violation: number;
    notEvaluable: number;
    pendingValidation: number;
    other: number;
  };
  /** True when at least one rule was capped by the severity matrix. */
  hasSeverityCaps: boolean;
};

export type ReportEngineeringChecklist = {
  topic: string;
  required: boolean;
  description: string;
};

export type TechnicalReportData = {
  metadata: {
    title: string;
    projectName: string;
    generatedAt: string;
    appVersion: string;
    locale: "en" | "es";
    schemaVersion: "1.2";
    disclaimer: string;
    reportId: string;
  };

  location: ReportLocation;

  designTargets: ProjectDesignTargets;
  sizingFromTargets: ReturnType<typeof computeArchitectureSizing>;
  reportKpis: ReportKpis;
  consistencyAlerts: ReportConsistencyAlert[];

  siteMetrics: ReportSiteMetrics;
  siteSvg: SiteSvgModel | null;
  mapCapture: MapCaptureResult | null;

  equipmentInventory: ReportEquipmentRow[];

  electrical: {
    blocks: number;
    stations: ConversionStation[];
    stationRows: ReportStationRow[];
    feeders: MVFeeder[];
    buses: MVBus[];
    poi: POI | null;
    mainTransformer: MainTransformer | null;
    auxiliaryServices: AuxiliaryServices | null;
    ppc: PPC | null;
    operationalLimits: OperationalLimits | null;
    lossEstimates: LossEstimate[];
  };

  regulatoryEvaluation: RegulatoryEvaluationResult | null;
  /**
   * Fase 9 — preliminary electrical checks block. Always present (even when
   * the architecture is not yet loaded) so the report layout is stable; in
   * that case `checks` is empty and the totals are zeroed.
   */
  preliminaryElectricalChecks: ReportPreliminaryElectricalBlock;

  assumptions: ProjectAssumption[];
  inconsistencies: DocumentInconsistency[];
  pendingData: PendingDataItem[];
  exclusions: ProjectExclusion[];
  disclaimers: { id: string; title: string; text: string }[];
  engineeringChecklist: ReportEngineeringChecklist[];
  infrastructure?: {
    blocksCount: number;
    cableRoutesCount: number;
    accessRoadsCount: number;
    totalCableLengthM: number;
    warnings: string[];
  };

  /** DocumentRegistry entries citados en cualquier parte del reporte. */
  documentReferences: DocumentRegistryEntry[];
};

// ──────────────────────────────────────────────────────────────────
// Defaults estáticos
// ──────────────────────────────────────────────────────────────────

/** Lista de exclusiones explícitas del análisis técnico ancla (§6). */
const EXCLUSION_TRANSLATIONS_EN: Record<string, { scope: string; reason: string; reportText: string }> = {
  "ex-load-flow": {
    scope: "Load flow study",
    reason: "Not calculated by the app",
    reportText: "Power flow study with network model",
  },
  "ex-short-circuit": {
    scope: "Short-circuit study",
    reason: "Not calculated by the app",
    reportText: "Short-circuit study",
  },
  "ex-protections-coordination": {
    scope: "Protections coordination",
    reason: "No coordination or settings provided",
    reportText: "Protections philosophy and settings report",
  },
  "ex-rms-emt-stability": {
    scope: "RMS/EMT stability studies",
    reason: "No RMS/EMT studies provided",
    reportText: "Certified models and stability reports",
  },
  "ex-harmonics": {
    scope: "Harmonics study",
    reason: "No harmonics evaluation provided",
    reportText: "Power quality supply report",
  },
  "ex-grounding-grid": {
    scope: "Grounding grid engineering",
    reason: "No grounding grid or step/touch voltage calculation",
    reportText: "Soil resistivity and grounding grid report",
  },
  "ex-geotechnical-civil": {
    scope: "Geotechnical and civil engineering detail",
    reason: "No geotechnical/foundation engineering provided",
    reportText: "Civil/geotechnical reports",
  },
  "ex-hydrology-drainage": {
    scope: "Hydrology and drainage study",
    reason: "No drainage calculation provided",
    reportText: "Hydrological/topographical report",
  },
  "ex-detailed-fire-safety": {
    scope: "Detailed fire safety engineering",
    reason: "No fire modeling or AHJ approval provided",
    reportText: "HSE and fire safety report",
  },
  "ex-environmental-permitting": {
    scope: "Environmental permitting (DIA/EIA)",
    reason: "No environmental permit filings provided",
    reportText: "Project environmental evaluation",
  },
  "ex-detailed-interconnection-hv": {
    scope: "Detailed HV interconnection and POI",
    reason: "No detailed substation/interconnection engineering",
    reportText: "High voltage engineering and CEN studies",
  },
  "ex-arc-flash": {
    scope: "Arc flash hazard study",
    reason: "The app does not compute incident energy or safe approach distances",
    reportText: "IEEE 1584 arc flash study",
  },
  "ex-insulation-coordination": {
    scope: "Insulation coordination (BIL)",
    reason: "The app does not model switching or lightning overvoltages",
    reportText: "Insulation coordination study",
  },
  "ex-power-quality-pcc": {
    scope: "Power quality at PCC",
    reason: "THD, unbalance and flicker require measurements and a network model",
    reportText: "Power quality study at the PCC",
  },
};

const DISCLAIMERS_EN: Record<string, { title: string; text: string }> = {
  generalMvp: {
    title: "General MVP Disclaimer",
    text: "This report corresponds to a preliminary BESS predesign. Results are useful for early capacity, physical footprint, conceptual configuration, and alternative comparison. They do not constitute detailed engineering, or construction, interconnection, operation, or final regulatory compliance authorization.",
  },
  conceptualSizing: {
    title: "Conceptual Sizing",
    text: "Electrical calculations are preliminary. They do not replace load flow, short circuit, protection coordination, RMS/EMT stability, harmonics, power quality, grounding grid, arc flash, or interconnection studies required by the national grid operator (Coordinador Eléctrico Nacional) or other authorities.",
  },
  documentTraceability: {
    title: "Document Traceability",
    text: "Equipment data is sourced from manufacturer public datasheets, public project reports, and technical references. When no official source exists for the exact model, data is presented as an editable assumption, benchmark, or pending validation. No referential value should be used contractually without document validation.",
  },
  uncertifiedRules: {
    title: "Uncertified Rules & Spacing",
    text: "Spacing values and non-certified catalog criteria correspond to predesign assumptions and preliminary benchmarks. They must be validated using the manufacturer's contractual documentation and do not constitute final design rules.",
  },
  fireSafetyPending: {
    title: "Fire Protection & UL 9540A Status",
    text: "References to UL 9540, UL 9540A, and NFPA 855 are used as technical context and preliminary checklist only. The app does not certify fire separation distances. All final separation must be validated with the exact model's UL 9540A report, manufacturer criteria, AHJ guidelines, insurer requirements, and local codes.",
  },
  electricalCompatibility: {
    title: "Preliminary Electrical Compatibility",
    text: "Compatibility between BESS containers, PCS, transformers, MV stations, EMS/PPC, and auxiliary systems is only definitive when confirmed by the manufacturer/EPC datasheet, manual, or BOM. The app suggests preliminary configurations but does not certify contractual compatibility.",
  },
  conceptualLayout: {
    title: "Conceptual Layout Limitations",
    text: "The generated layout is conceptual. It requires validation using the manufacturer's layout guide, civil drawing, maintenance clearance criteria, emergency roads, turning radii, environmental restrictions, topography, drainage, geotech, and AHJ/insurer criteria.",
  },
  conceptualInfrastructure: {
    title: "Trenching & Access Roads",
    text: "Cabling, trenches, and cable corridors are shown as conceptual layers. Final sizing requires a cable schedule, routing calculations, thermal backfill, grouping factors, ampacity calculations, voltage drop, and civil details.",
  },
  internationalReferenceOnly: {
    title: "International Standards Context",
    text: "International standards (such as NFPA 855, UL 9540, UL 9540A, IEC 62933, or IEEE 2800) are cited solely as technical references and predesign guidelines where applicable. They do not replace mandatory codes and technical instructions issued by SEC or other local Chilean authorities.",
  },
  shortInterface: {
    title: "Short Interface Disclaimer",
    text: "Preliminary predesign. Requires manufacturer/EPC/AHJ validation and detailed engineering studies before being used for design, permitting, construction, or operation.",
  },
};

export function getReportDefaultExclusions(locale: "en" | "es"): ProjectExclusion[] {
  return exclusionRegistry.map((ex) => {
    if (locale === "en") {
      const trans = EXCLUSION_TRANSLATIONS_EN[ex.id];
      return {
        id: ex.id.replace("ex-", "EXC-").toUpperCase(),
        scope: trans ? trans.scope : ex.label,
        reason: trans ? `${trans.reason} — Requires: ${trans.reportText}` : `${ex.reason} — Requiere: ${ex.reportText}`,
        futureStage: "detail_engineering" as const,
      };
    }
    return {
      id: ex.id.replace("ex-", "EXC-").toUpperCase(),
      scope: ex.label,
      reason: `${ex.reason} — Requiere: ${ex.reportText}`,
      futureStage: "detail_engineering" as const,
    };
  });
}

/** Checklist de ingeniería de detalle que aparece siempre en el reporte. */
export const REPORT_DEFAULT_CHECKLIST: ReportEngineeringChecklist[] = [
  {
    topic: "Short-circuit and protection coordination study",
    required: true,
    description: "Validate breaker ratings, relay settings and selectivity.",
  },
  {
    topic: "Detailed grounding grid design",
    required: true,
    description: "Soil resistivity, touch / step voltage calculation.",
  },
  {
    topic: "Foundation and structural engineering",
    required: true,
    description: "Geotechnical study, container and PCS load distribution.",
  },
  {
    topic: "Fire suppression and HSE plan (NFPA 855 / UL 9540A / AHJ)",
    required: true,
    description: "Hazard Mitigation Analysis, evacuation routes, water supply.",
  },
  {
    topic: "HVAC sizing and SSAA detailed model",
    required: true,
    description: "Climate-specific consumption, derating, ventilation airflow.",
  },
  {
    topic: "Cable ampacity and ductbank engineering",
    required: true,
    description: "Thermal soil model, grouping and code compliance.",
  },
  {
    topic: "Internal road / access geometry",
    required: true,
    description: "Crane and emergency vehicle turning radius and slope.",
  },
  {
    topic: "Sismic design verification (CNE REX 41/2025)",
    required: true,
    description: "Mounting, anchoring and structural design for seismic loads.",
  },
  {
    topic: "Environmental permitting (SEA DS17/2026, DS 38 noise, DS 148 waste)",
    required: true,
    description: "SEIA pertinence, noise compliance, hazardous waste plan.",
  },
  {
    topic: "Municipal / DOM permit (OGUC DS 47)",
    required: true,
    description: "Building permit, zoning, MINVU DDU 522 alignment.",
  },
  {
    topic: "Interconnection with CEN / Coordinador (Anexo 2 NI/MR/MNR)",
    required: true,
    description: "Power flow, protection settings, dynamic studies.",
  },
  {
    topic: "Manufacturer installation manual review",
    required: true,
    description: "Confirm clearances, HVAC, fire and warranty requirements.",
  },
];

// ──────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────

function centroidOf(polygon: LngLat[]): LngLat | null {
  if (polygon.length === 0) return null;
  let sumLng = 0;
  let sumLat = 0;
  for (const p of polygon) {
    sumLng += p.lng;
    sumLat += p.lat;
  }
  return {
    lng: sumLng / polygon.length,
    lat: sumLat / polygon.length,
  };
}

function aggregateEquipment(placed: PlacedEquipment[]): ReportEquipmentRow[] {
  const byKey = new Map<string, ReportEquipmentRow>();
  for (const item of placed) {
    const spec = equipmentCatalog.find((s) => s.id === item.equipmentSpecId);
    if (!spec) continue;
    const key = spec.id;
    const existing = byKey.get(key);
    if (existing) {
      existing.count += 1;
      continue;
    }
    byKey.set(key, {
      type: spec.type,
      manufacturer: spec.manufacturer,
      model: spec.model,
      count: 1,
      lengthM: spec.footprint.length_m,
      widthM: spec.footprint.width_m,
      heightM: spec.footprint.height_m,
      weightKg: spec.mass?.weight_kg,
    });
  }
  return [...byKey.values()].sort((a, b) =>
    a.type === b.type
      ? a.model.localeCompare(b.model)
      : a.type.localeCompare(b.type)
  );
}

function evidencedDerived(value: number, unit: string, note: string): EvidencedValue<number> {
  return {
    value,
    unit,
    evidence: [{ documentId: "__none__", confidence: "derived", note }],
  };
}

function round(value: number, digits = 6): number {
  if (!Number.isFinite(value)) return value;
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function deriveKpisFromLayout(args: {
  placed: PlacedEquipment[];
  blocks: { id: string }[];
  conversionStations: ConversionStation[];
  mvFeeders: MVFeeder[];
  mvBuses: MVBus[];
  designTargets: ProjectDesignTargets;
}): {
  kpis: ReportKpis;
  normalizedTargets: ProjectDesignTargets;
  alerts: ReportConsistencyAlert[];
} {
  let containers = 0;
  let stationsFromLayout = 0;
  let grossEnergyMWh = 0;
  let pcsPowerMVA = 0;
  let batteryPowerMVA = 0;

  for (const item of args.placed) {
    const spec = equipmentCatalog.find((entry) => entry.id === item.equipmentSpecId);
    if (!spec) continue;
    if (spec.type === "battery_container") {
      containers += 1;
      grossEnergyMWh += spec.electrical?.energy_mwh_dc_bol ?? 0;
      // Integrated units (e.g. Tesla Megapack) carry their AC power on the unit
      // itself; separate-PCS containers (Sungrow) carry none, so this stays 0
      // for them and the integrated branch below is never taken.
      batteryPowerMVA += spec.electrical?.apparent_power_mva ?? 0;
    }
    if (spec.type === "pcs_mv_station") {
      stationsFromLayout += 1;
      pcsPowerMVA += spec.electrical?.apparent_power_mva ?? 0;
    }
  }

  // Architecture-aware installed power: separate-PCS layouts (Sungrow) are sized
  // by their PCS apparent power; integrated layouts (Tesla) by the unit AC
  // power. Identical to prior behaviour whenever a PCS/MV station is present.
  const isIntegrated =
    stationsFromLayout === 0 && containers > 0 && batteryPowerMVA > 0;
  const integratedUnitCount = isIntegrated ? containers : 0;
  const installedPowerMVA =
    stationsFromLayout > 0 ? pcsPowerMVA : batteryPowerMVA;

  const stations =
    args.conversionStations.length > 0 ? args.conversionStations.length : stationsFromLayout;
  const feeders =
    args.mvFeeders.length > 0
      ? args.mvFeeders.length
      : stations > 0
        ? Math.ceil(stations / DEFAULT_STATIONS_PER_FEEDER)
        : 0;
  const blocks = args.blocks.length > 0 ? args.blocks.length : stations;
  const buses = args.mvBuses.length;
  const usableFactor = args.designTargets.usableFactor?.value ?? DEFAULT_USABLE_FACTOR;
  const usableEnergyMWh = round(grossEnergyMWh * usableFactor);
  const commercialEnergyMWh =
    args.designTargets.usableEnergyCommercialMWh?.value ??
    (usableEnergyMWh > 0 ? usableEnergyMWh : null);
  const poiPowerMW =
    args.designTargets.powerMW?.value ?? (installedPowerMVA > 0 ? installedPowerMVA : null);
  const durationHours =
    args.designTargets.durationHours ??
    (commercialEnergyMWh !== null && installedPowerMVA > 0
      ? round(commercialEnergyMWh / installedPowerMVA, 3)
      : null);
  const containersPerStation =
    stations > 0 && containers > 0 ? round(containers / stations, 3) : null;

  const alerts: ReportConsistencyAlert[] = [];
  const normalizedTargets: ProjectDesignTargets = { ...args.designTargets };

  if (!args.designTargets.powerMW && installedPowerMVA > 0) {
    normalizedTargets.powerMW = evidencedDerived(
      installedPowerMVA,
      "MW",
      isIntegrated
        ? "Estimated from placed integrated-unit AC power (PCS/inverter integrated in the unit; external MV step-up transformer not modeled). Active power and power factor require validation."
        : "Estimated from placed PCS/MV apparent power. Active power and power factor require validation."
    );
    alerts.push({
      id: "RPT-SYNC-001",
      severity: "critical",
      title: "Potencia de portada derivada desde layout",
      message: isIntegrated
        ? "El proyecto no tenía potencia POI persistida, pero el layout contiene unidades integradas (PCS/inversor integrado en la unidad). El reporte usa potencia instalada aproximada para evitar un KPI falso en cero."
        : "El proyecto no tenía potencia POI persistida, pero el layout contiene estaciones PCS/MV. El reporte usa potencia instalada aproximada para evitar un KPI falso en cero.",
      recommendation:
        "Cargar o sincronizar la arquitectura v1.2 / preset técnico antes de emitir un informe formal.",
    });
  }

  if (!args.designTargets.grossEnergyMWh && grossEnergyMWh > 0) {
    normalizedTargets.grossEnergyMWh = evidencedDerived(
      round(grossEnergyMWh),
      "MWh",
      "Derived from placed BESS container count and catalog energy per container."
    );
  }

  if (!args.designTargets.usableEnergyCommercialMWh && usableEnergyMWh > 0) {
    normalizedTargets.usableEnergyCommercialMWh = evidencedDerived(
      usableEnergyMWh,
      "MWh",
      "Estimated as gross layout energy multiplied by the default usable factor."
    );
    alerts.push({
      id: "RPT-SYNC-002",
      severity: "warning",
      title: "Energía comercial estimada desde inventario",
      message:
        "No había energía comercial declarada en targets. Se estimó desde los contenedores colocados para mantener consistencia con el inventario físico.",
      recommendation:
        "Confirmar energía contractual/usable del proyecto y persistirla como dato documentado.",
    });
  }

  if (!args.designTargets.usableEnergyMWh && usableEnergyMWh > 0) {
    normalizedTargets.usableEnergyMWh = evidencedDerived(
      usableEnergyMWh,
      "MWh",
      "Derived from gross layout energy and usable factor."
    );
  }

  if (!args.designTargets.durationHours && durationHours !== null) {
    normalizedTargets.durationHours = durationHours;
  }

  if (containers > 0 && args.blocks.length === 0) {
    alerts.push({
      id: "RPT-SYNC-003",
      severity: "warning",
      title: "Bloques eléctricos no sincronizados",
      message:
        "El layout físico contiene contenedores, pero el slice de bloques BESS está vacío. El reporte deriva bloques desde estaciones PCS/MV.",
      recommendation:
        "Ejecutar carga de preset v1.2 o sincronización de arquitectura antes de cerrar trazabilidad eléctrica.",
    });
  }

  if (stationsFromLayout > 0 && args.conversionStations.length === 0) {
    alerts.push({
      id: "RPT-SYNC-004",
      severity: "critical",
      title: "Estaciones PCS/MV en layout sin arquitectura eléctrica persistida",
      message:
        "El inventario físico contiene estaciones PCS/MV, pero conversionStations está vacío. El reporte deriva conteos desde el layout.",
      recommendation:
        "Sincronizar el layout con ConversionStation[] para habilitar validaciones eléctricas completas.",
    });
  }

  const source: ReportKpiSource =
    alerts.length === 0
      ? "documented_targets"
      : args.designTargets.powerMW || args.designTargets.usableEnergyCommercialMWh
        ? "mixed"
        : "layout_inventory";

  return {
    normalizedTargets,
    alerts,
    kpis: {
      source,
      poiPowerMW,
      installedPowerMVA: round(installedPowerMVA),
      commercialEnergyMWh,
      grossEnergyMWh: round(grossEnergyMWh),
      usableEnergyMWh,
      durationHours,
      containers,
      stations,
      feeders,
      blocks,
      buses,
      containersPerStation,
      isIntegrated,
      integratedUnitCount,
    },
  };
}

function buildStationRows(stations: ConversionStation[]): ReportStationRow[] {
  return stations.map((s) => ({
    id: s.id,
    manufacturer: s.manufacturer,
    model: s.model,
    ratedMVA: s.ratedPowerMVA.value,
    feederId: s.mvFeederId,
    containerCount: s.associatedContainerIds.length,
  }));
}

function collectDocReferences(args: {
  designTargets: ProjectDesignTargets;
  assumptions: ProjectAssumption[];
  inconsistencies: DocumentInconsistency[];
  regulatoryEvaluation: RegulatoryEvaluationResult | null;
  electrical: { stations: ConversionStation[]; feeders: MVFeeder[]; buses: MVBus[]; poi: POI | null; mainTransformer: MainTransformer | null; ppc: PPC | null };
  placed: PlacedEquipment[];
}): DocumentRegistryEntry[] {
  const refs = new Set<string>();
  const add = (id: string | undefined) => {
    if (id && id !== "__none__") refs.add(id);
  };

  const collectEvidence = (evList?: { documentId: string }[]) => {
    for (const e of evList ?? []) add(e.documentId);
  };

  collectEvidence(args.designTargets.powerMW?.evidence);
  collectEvidence(args.designTargets.usableEnergyCommercialMWh?.evidence);
  collectEvidence(args.designTargets.grossEnergyMWh?.evidence);
  collectEvidence(args.designTargets.usableFactor?.evidence);

  for (const a of args.assumptions) collectEvidence(a.evidence);
  for (const i of args.inconsistencies) {
    for (const cv of i.conflictingValues) add(cv.evidence.documentId);
  }

  if (args.regulatoryEvaluation) {
    for (const id of args.regulatoryEvaluation.documentRegistryRefs) {
      refs.add(id);
    }
  }

  for (const s of args.electrical.stations) collectEvidence(s.evidence);
  for (const f of args.electrical.feeders) collectEvidence(f.evidence);
  for (const b of args.electrical.buses) collectEvidence(b.evidence);
  if (args.electrical.poi) collectEvidence(args.electrical.poi.evidence);
  if (args.electrical.mainTransformer)
    collectEvidence(args.electrical.mainTransformer.evidence);
  if (args.electrical.ppc) collectEvidence(args.electrical.ppc.evidence);

  for (const p of args.placed) {
    const spec = equipmentCatalog.find((s) => s.id === p.equipmentSpecId);
    if (spec?.source.evidence) collectEvidence(spec.source.evidence);
    if (spec?.compliance?.certifications)
      collectEvidence(spec.compliance.certifications);
  }

  // Mantener el orden del registry oficial para la portada.
  return documentRegistry.filter((d) => refs.has(d.id));
}

function buildPreliminaryElectricalBlock(
  evaluation: RegulatoryEvaluationResult | null
): ReportPreliminaryElectricalBlock {
  const empty: ReportPreliminaryElectricalBlock = {
    checks: [],
    totals: { pass: 0, violation: 0, notEvaluable: 0, pendingValidation: 0, other: 0 },
    hasSeverityCaps: false,
  };
  if (!evaluation) return empty;

  const fase8 = evaluation.byCategory.electrical
    .filter((e) => isPhase8ElectricalRuleId(e.ruleId))
    .sort((a, b) => a.ruleId.localeCompare(b.ruleId));

  const checks: ReportPreliminaryElectricalCheck[] = fase8.map((entry) => {
    const cite = entry.evidence.find(
      (e) => e.documentId && e.documentId !== "__none__"
    );
    let citation: string | null = null;
    if (cite) {
      const doc = findDocument(cite.documentId);
      const title = doc?.title ?? cite.documentId;
      const page = cite.page ? ` · p.${cite.page}` : "";
      const section = cite.section ? ` · §${cite.section}` : "";
      citation = `${title}${page}${section}`;
    }
    return {
      ruleId: entry.ruleId,
      title: entry.title,
      description: entry.description,
      effectiveSeverity: entry.severity,
      declaredSeverity: entry.declaredSeverity,
      documentLevel: strongestCitedLevel(entry.evidence),
      outcome: entry.outcome,
      severityCappedBy: entry.severityCappedBy,
      citation,
      violations: entry.violations.map((v) => ({
        message: v.message,
        affectedIds: v.affectedIds,
      })),
    };
  });

  const totals = checks.reduce(
    (acc, c) => {
      switch (c.outcome) {
        case "pass":
          acc.pass++;
          break;
        case "violation":
          acc.violation++;
          break;
        case "not_evaluable":
          acc.notEvaluable++;
          break;
        case "pending_validation":
          acc.pendingValidation++;
          break;
        default:
          acc.other++;
      }
      return acc;
    },
    { pass: 0, violation: 0, notEvaluable: 0, pendingValidation: 0, other: 0 }
  );

  return {
    checks,
    totals,
    hasSeverityCaps: checks.some((c) => c.severityCappedBy !== null),
  };
}

// ──────────────────────────────────────────────────────────────────
// API pública
// ──────────────────────────────────────────────────────────────────

export type BuildReportDataArgs = {
  projectName?: string;
  appVersion?: string;
  locale: "en" | "es";
  polygon: LngLat[];
  anchor: ProjectAnchor | null;
  placed: PlacedEquipment[];
  designTargets: ProjectDesignTargets;
  blocks: { id: string }[];
  conversionStations: ConversionStation[];
  mvFeeders: MVFeeder[];
  mvBuses: MVBus[];
  poi: POI | null;
  mainTransformer: MainTransformer | null;
  auxiliaryServices: AuxiliaryServices | null;
  ppc: PPC | null;
  operationalLimits: OperationalLimits | null;
  lossEstimates: LossEstimate[];
  assumptions: ProjectAssumption[];
  inconsistencies: DocumentInconsistency[];
  pendingData: PendingDataItem[];
  regulatoryEvaluation: RegulatoryEvaluationResult | null;
  caseStudy?: ProjectCaseStudy | null;
  mapCapture: MapCaptureResult | null;
  geocode: ReverseGeocodeResult | null;
};

export function buildReportData(args: BuildReportDataArgs): TechnicalReportData {
  const centroid = centroidOf(args.polygon);
  const formats = centroid ? formatCoordinatesBundle(centroid) : null;

  const siteAreaInfo =
    args.polygon.length >= 3 ? polygonAreaFromLngLat(args.polygon) : null;
  const siteAreaM2 = siteAreaInfo?.area_m2 ?? 0;
  const siteSvg = buildSiteSvg({
    polygon: args.polygon,
    anchor: args.anchor,
    placed: args.placed,
  });

  const generatedInfra = generateConceptualPhysicalInfrastructure({
    placed: args.placed,
    anchor: args.anchor,
    polygon: args.polygon,
    hasPoi: !!args.poi,
  });

  const blockCount = new Set(
    args.placed.map((item) => item.blockId).filter(Boolean)
  ).size;

  const totalCableLength = generatedInfra.cableRoutes.reduce(
    (sum, route) => sum + (route.estimatedLength_m ?? 0),
    0
  );

  const infrastructure = {
    blocksCount: blockCount,
    cableRoutesCount: generatedInfra.cableRoutes.length,
    accessRoadsCount: generatedInfra.accessRoads.length,
    totalCableLengthM: Math.round(totalCableLength),
    warnings: generatedInfra.diagnostics.warnings ?? [],
  };

  const derived = deriveKpisFromLayout({
    placed: args.placed,
    blocks: args.blocks,
    conversionStations: args.conversionStations,
    mvFeeders: args.mvFeeders,
    mvBuses: args.mvBuses,
    designTargets: args.designTargets,
  });

  const sizingFromTargets = computeArchitectureSizing({
    targetPowerMW: derived.normalizedTargets.powerMW?.value,
    targetUsableEnergyMWh: derived.normalizedTargets.usableEnergyCommercialMWh?.value,
  });

  const equipmentCounts = aggregateEquipment(args.placed).map((row) => ({
    type: row.type,
    count: row.count,
  }));

  const equipmentInventory = aggregateEquipment(args.placed);
  const stationRows = buildStationRows(args.conversionStations);
  const effectiveStationRows =
    stationRows.length > 0
      ? stationRows
      : equipmentInventory
          .filter((row) => row.type === "pcs_mv_station")
          .map((row, index) => ({
            id: `layout-pcs-${String(index + 1).padStart(2, "0")}`,
            manufacturer: row.manufacturer,
            model: row.model,
            ratedMVA: row.count > 0 ? derived.kpis.installedPowerMVA / row.count : 0,
            feederId: undefined,
            containerCount:
              derived.kpis.stations > 0
                ? Math.round(derived.kpis.containers / derived.kpis.stations)
                : 0,
          }));

  const documentReferences = collectDocReferences({
    designTargets: args.designTargets,
    assumptions: args.assumptions,
    inconsistencies: args.inconsistencies,
    regulatoryEvaluation: args.regulatoryEvaluation,
    electrical: {
      stations: args.conversionStations,
      feeders: args.mvFeeders,
      buses: args.mvBuses,
      poi: args.poi,
      mainTransformer: args.mainTransformer,
      ppc: args.ppc,
    },
    placed: args.placed,
  });

  // ID corto del reporte: combinacion fecha + hash truncado del nombre.
  const reportId = `BESS-${Date.now().toString(36).toUpperCase()}`;

  // Si el caso de estudio existe, traer exclusiones específicas + las default.
  const exclusionsFromCase = args.caseStudy?.exclusions ?? [];
  const defaultExclusions = getReportDefaultExclusions(args.locale);
  const exclusions: ProjectExclusion[] = [
    ...defaultExclusions,
    ...exclusionsFromCase,
  ].filter(
    (item, index, list) => list.findIndex((other) => other.scope === item.scope) === index
  );

  const disclaimers = args.locale === "es" ? [
    { id: "DISC-GEN", title: "Advertencia General del MVP", text: disclaimerTexts.generalMvp },
    { id: "DISC-SIZ", title: "Predimensionamiento Conceptual", text: disclaimerTexts.conceptualSizing },
    { id: "DISC-TRACE", title: "Trazabilidad Documental", text: disclaimerTexts.documentTraceability },
    { id: "DISC-UNCERT", title: "Reglas no Certificadas", text: disclaimerTexts.uncertifiedRules },
    { id: "DISC-FIRE", title: "Incendio y UL 9540A Pendiente", text: disclaimerTexts.fireSafetyPending },
    { id: "DISC-COMPAT", title: "Compatibilidad Eléctrica Preliminar", text: disclaimerTexts.electricalCompatibility },
    { id: "DISC-LAYOUT", title: "Layout Preliminar", text: disclaimerTexts.conceptualLayout },
    { id: "DISC-INFRA", title: "Canalizaciones y Caminos Preliminares", text: disclaimerTexts.conceptualInfrastructure },
    { id: "DISC-INT", title: "Normativa Internacional de Referencia", text: disclaimerTexts.internationalReferenceOnly }
  ] : [
    { id: "DISC-GEN", title: DISCLAIMERS_EN.generalMvp.title, text: DISCLAIMERS_EN.generalMvp.text },
    { id: "DISC-SIZ", title: DISCLAIMERS_EN.conceptualSizing.title, text: DISCLAIMERS_EN.conceptualSizing.text },
    { id: "DISC-TRACE", title: DISCLAIMERS_EN.documentTraceability.title, text: DISCLAIMERS_EN.documentTraceability.text },
    { id: "DISC-UNCERT", title: DISCLAIMERS_EN.uncertifiedRules.title, text: DISCLAIMERS_EN.uncertifiedRules.text },
    { id: "DISC-FIRE", title: DISCLAIMERS_EN.fireSafetyPending.title, text: DISCLAIMERS_EN.fireSafetyPending.text },
    { id: "DISC-COMPAT", title: DISCLAIMERS_EN.electricalCompatibility.title, text: DISCLAIMERS_EN.electricalCompatibility.text },
    { id: "DISC-LAYOUT", title: DISCLAIMERS_EN.conceptualLayout.title, text: DISCLAIMERS_EN.conceptualLayout.text },
    { id: "DISC-INFRA", title: DISCLAIMERS_EN.conceptualInfrastructure.title, text: DISCLAIMERS_EN.conceptualInfrastructure.text },
    { id: "DISC-INT", title: DISCLAIMERS_EN.internationalReferenceOnly.title, text: DISCLAIMERS_EN.internationalReferenceOnly.text }
  ];

  return {
    metadata: {
      title:
        args.locale === "es"
          ? "Reporte preliminar de predimensionamiento BESS"
          : "BESS preliminary predesign report",
      projectName:
        args.projectName ??
        args.caseStudy?.projectName ??
        (args.locale === "es" ? "Proyecto BESS sin nombre" : "Untitled BESS project"),
      generatedAt: new Date().toISOString(),
      appVersion: args.appVersion ?? "0.1.0",
      locale: args.locale,
      schemaVersion: "1.2",
      disclaimer: args.locale === "es" ? disclaimerTexts.generalMvp : DISCLAIMERS_EN.generalMvp.text,
      reportId,
    },

    location: {
      centroid,
      formats,
      geocode: args.geocode,
      describedPlace: describeLocation(args.geocode),
    },

    designTargets: derived.normalizedTargets,
    sizingFromTargets,
    reportKpis: derived.kpis,
    consistencyAlerts: [
      ...derived.alerts,
      ...args.pendingData
        .filter((item) =>
          /inconsisten|discrep|modelo|tensi[oó]n|voltage/i.test(
            `${item.topic} ${item.reason}`
          )
        )
        .slice(0, 6)
        .map((item): ReportConsistencyAlert => ({
          id: `PEND-${item.id}`,
          severity: item.priority === "critical" ? "critical" : "warning",
          title: item.topic,
          message: item.reason,
          recommendation: `Validar contra fuente sugerida: ${item.suggestedSource}.`,
        })),
    ],

    siteMetrics: {
      areaM2: siteAreaM2,
      areaHa: siteAreaM2 / 10_000,
      equipmentCounts,
      bbox: siteSvg?.bboxLocalM ?? null,
    },
    siteSvg,
    mapCapture: args.mapCapture,

    equipmentInventory,

    electrical: {
      blocks: derived.kpis.blocks,
      stations: args.conversionStations,
      stationRows: effectiveStationRows,
      feeders: args.mvFeeders,
      buses: args.mvBuses,
      poi: args.poi,
      mainTransformer: args.mainTransformer,
      auxiliaryServices: args.auxiliaryServices,
      ppc: args.ppc,
      operationalLimits: args.operationalLimits,
      lossEstimates: args.lossEstimates,
    },

    regulatoryEvaluation: args.regulatoryEvaluation,
    preliminaryElectricalChecks: buildPreliminaryElectricalBlock(
      args.regulatoryEvaluation
    ),

    assumptions: args.assumptions,
    inconsistencies: args.inconsistencies,
    pendingData: args.pendingData,
    exclusions,
    disclaimers,
    engineeringChecklist: REPORT_DEFAULT_CHECKLIST,
    infrastructure,

    documentReferences,
  };
}

/** Helper para resolver título legible de un documentId (para citas). */
export function documentTitle(id: string): string {
  const doc = findDocument(id);
  return doc?.title ?? id;
}
