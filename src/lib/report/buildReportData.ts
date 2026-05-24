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
import type { RegulatoryEvaluationResult } from "@/rules/regulatoryProfileEvaluator";
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

  assumptions: ProjectAssumption[];
  inconsistencies: DocumentInconsistency[];
  pendingData: PendingDataItem[];
  exclusions: ProjectExclusion[];
  engineeringChecklist: ReportEngineeringChecklist[];

  /** DocumentRegistry entries citados en cualquier parte del reporte. */
  documentReferences: DocumentRegistryEntry[];
};

// ──────────────────────────────────────────────────────────────────
// Defaults estáticos
// ──────────────────────────────────────────────────────────────────

const DISCLAIMER_EN =
  "This report is a preliminary engineering evaluation. It does not replace detailed engineering, manufacturer manuals, protection coordination, short-circuit studies, ground grid design, fire protection engineering, environmental permitting, civil engineering, or final review by SEC, CNE, CEN, SEA or any authority having jurisdiction.";

const DISCLAIMER_ES =
  "Este reporte es una evaluación preliminar de ingeniería. No reemplaza ingeniería de detalle, manuales de fabricante, coordinación de protecciones, estudios de cortocircuito, diseño de malla a tierra, ingeniería contra incendios, permisos ambientales, ingeniería civil, ni revisión final por SEC, CNE, CEN, SEA o cualquier autoridad competente.";

/** Lista de exclusiones explícitas del análisis técnico ancla (§6). */
export const REPORT_DEFAULT_EXCLUSIONS: ProjectExclusion[] = [
  {
    id: "EXC-001",
    scope: "Short-circuit studies and protection coordination",
    reason: "Requires power-system simulation tools and validated network models.",
    futureStage: "detail_engineering",
  },
  {
    id: "EXC-002",
    scope: "Detailed load flow / RMS / EMT studies",
    reason: "Outside the scope of preliminary layout sizing.",
    futureStage: "detail_engineering",
  },
  {
    id: "EXC-003",
    scope: "Ground grid design",
    reason: "Depends on soil resistivity, fault current studies and civil work.",
    futureStage: "detail_engineering",
  },
  {
    id: "EXC-004",
    scope: "Foundation and structural civil engineering",
    reason: "Requires geotechnical studies and final loads.",
    futureStage: "detail_engineering",
  },
  {
    id: "EXC-005",
    scope: "Cable trench and ductbank engineering",
    reason: "Requires ampacity, soil thermal, grouping and code-detailed routing.",
    futureStage: "detail_engineering",
  },
  {
    id: "EXC-006",
    scope: "Detailed thermal cable sizing",
    reason: "Preliminary cross-sections are illustrative only.",
    futureStage: "detail_engineering",
  },
  {
    id: "EXC-007",
    scope: "Detailed fire suppression engineering",
    reason: "Requires NFPA/IFC compliance, manufacturer test data and AHJ.",
    futureStage: "detail_engineering",
  },
  {
    id: "EXC-008",
    scope: "Detailed HVAC engineering",
    reason: "Climate, container thermal profile and consumption to be specified.",
    futureStage: "basic_engineering",
  },
  {
    id: "EXC-009",
    scope: "CCTV, lighting and telecom per cabinet",
    reason: "Does not drive MW/MWh or major layout decisions.",
    futureStage: "detail_engineering",
  },
  {
    id: "EXC-010",
    scope: "HV substation engineering",
    reason: "BESS scope ends at the 33 kV POI in the preset; main transformer is referential.",
    futureStage: "basic_engineering",
  },
  {
    id: "EXC-011",
    scope: "Permitting workflows (SEIA, DOM, SEC submission)",
    reason: "Requires legal review; this report only flags applicable items.",
    futureStage: "basic_engineering",
  },
  {
    id: "EXC-012",
    scope: "CAPEX / OPEX estimation",
    reason: "Outside the preliminary sizing scope unless explicitly enabled.",
    futureStage: "basic_engineering",
  },
];

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
  let installedPowerMVA = 0;

  for (const item of args.placed) {
    const spec = equipmentCatalog.find((entry) => entry.id === item.equipmentSpecId);
    if (!spec) continue;
    if (spec.type === "battery_container") {
      containers += 1;
      grossEnergyMWh += spec.electrical?.energy_mwh_dc_bol ?? 0;
    }
    if (spec.type === "pcs_mv_station") {
      stationsFromLayout += 1;
      installedPowerMVA += spec.electrical?.apparent_power_mva ?? 0;
    }
  }

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
      "Estimated from placed PCS/MV apparent power. Active power and power factor require validation."
    );
    alerts.push({
      id: "RPT-SYNC-001",
      severity: "critical",
      title: "Potencia de portada derivada desde layout",
      message:
        "El proyecto no tenía potencia POI persistida, pero el layout contiene estaciones PCS/MV. El reporte usa potencia instalada aproximada para evitar un KPI falso en cero.",
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
  const exclusions: ProjectExclusion[] = [
    ...REPORT_DEFAULT_EXCLUSIONS,
    ...exclusionsFromCase,
  ].filter(
    (item, index, list) => list.findIndex((other) => other.scope === item.scope) === index
  );

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
      disclaimer: args.locale === "es" ? DISCLAIMER_ES : DISCLAIMER_EN,
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

    assumptions: args.assumptions,
    inconsistencies: args.inconsistencies,
    pendingData: args.pendingData,
    exclusions,
    engineeringChecklist: REPORT_DEFAULT_CHECKLIST,

    documentReferences,
  };
}

/** Helper para resolver título legible de un documentId (para citas). */
export function documentTitle(id: string): string {
  const doc = findDocument(id);
  return doc?.title ?? id;
}
