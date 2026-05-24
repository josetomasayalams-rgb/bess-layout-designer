# 04 — Modelo de datos propuesto

Entidades, campos y relaciones para soportar el predimensionamiento BESS con trazabilidad documental. Pseudocódigo TypeScript siguiendo la convención del proyecto (`metric_si`, campos con sufijo `_m`, `_kg`, `_mwh`, `_mw`, `_kv`, `_hz`, etc.).

Origen: síntesis del análisis técnico ancla del caso BESS del Desierto + estado actual de `src/types/` + brechas identificadas en `03_GAP_ANALYSIS.md`.

---

## 1. Sistema transversal de evidencia

```ts
// src/types/evidence.ts (NUEVO)

export type EvidenceConfidence =
  | "documented"     // PDF oficial + página + numeral
  | "derived"        // calculado a partir de docs documentados
  | "inferred"       // deducido del patrón observado (ej. unifilar visual)
  | "assumption"     // valor preliminar editable
  | "missing";       // sin fuente; se necesita validar

export type EvidenceRef = {
  /** ID del documento en DocumentRegistry */
  documentId: string;
  /** Página dentro del PDF (1-indexed) */
  page?: number;
  /** Numeral / artículo / sección citado */
  section?: string;
  /** Nota libre del evaluador (no es la fuente, es la interpretación) */
  note?: string;
  /** Nivel de confianza */
  confidence: EvidenceConfidence;
};

/** Valor con trazabilidad documental */
export type EvidencedValue<T> = {
  value: T;
  unit?: string;
  evidence: EvidenceRef[];
  mustVerifyBeforeIFC?: boolean;
};
```

```ts
// src/data/documentRegistry.ts (NUEVO)

export type DocumentSource =
  | "sec_rgr" | "sec_ric" | "sec_rptd"
  | "cne" | "cen"
  | "minvu" | "sea" | "mma" | "minsal"
  | "law" | "decree"
  | "manufacturer_datasheet"
  | "manufacturer_manual"
  | "manufacturer_whitepaper"
  | "third_party_reference"
  | "project_report"      // EE-EN-2025-1129, etc.
  | "internal_summary"
  | "international_standard"; // NFPA, UL, IEC

export type DocumentRegistryEntry = {
  id: string;                  // "SEC-RGR-06-2024", "SUNGROW-ST2752UX-V15", "EE-EN-2025-1129"
  title: string;
  source: DocumentSource;
  /** Ruta relativa dentro de DIRECTRICES_APP_BESS/ */
  path: string;
  version?: string;
  publishedAt?: string;        // ISO date
  validFrom?: string;
  replacedBy?: string;         // ID de otro DocumentRegistryEntry
  hashSha256?: string;
  /** true si es fuente primaria (PDF oficial original) */
  isPrimary: boolean;
};

export const documentRegistry: DocumentRegistryEntry[] = [
  // Ejemplos:
  // { id: "SEC-RGR-06-2024", title: "SEC RGR 06/2024 BESS", source: "sec_rgr",
  //   path: "01_NORMATIVA_SEC_RGR_RIC/SEC_RGR_BESS/SEC_RGR_06_2024_BESS.pdf",
  //   isPrimary: true }
];
```

---

## 2. Proyecto (raíz)

```ts
// src/types/project.ts (EXTENDER existente)

export interface ProjectBESS {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  updatedAt: string;

  /** Coordenadas del polígono de sitio (en LngLat). Ya existe. */
  polygon: LngLat[];
  anchor: ProjectAnchor | null;

  /** Objetivos de diseño */
  designTargets: {
    powerMW?: EvidencedValue<number>;
    /** Energía comercial declarada (lo que se vende). Para caso base = 800 MWh */
    usableEnergyCommercialMWh?: EvidencedValue<number>;
    /** Energía bruta instalada (suma de container nameplate). Para caso base = 880.80384 MWh */
    grossEnergyMWh?: EvidencedValue<number>;
    /** Energía usable real (con DoD, degradación, EOL). Editable. */
    usableEnergyMWh?: EvidencedValue<number>;
    /** Factor 0..1 que conecta bruto con usable */
    usableFactor?: EvidencedValue<number>;
    durationHours?: number; // derivado
  };

  /** Capa 1 — física */
  zones: LayoutZone[];
  placedEquipment: PlacedEquipment[]; // ya existe
  cableRoutes: CableRoute[];
  accessRoads: AccessRoad[];
  fireSafetyZones: FireSafetyZone[];

  /** Capa 2 — eléctrica */
  blocks: BESSBlock[];
  conversionStations: ConversionStation[];
  mvFeeders: MVFeeder[];
  mvBuses: MVBus[];
  poi: POI;
  mainTransformer?: MainTransformer;
  auxiliaryServices?: AuxiliaryServices;
  ppc?: PPC;

  /** Capa 3 — trazabilidad */
  assumptions: ProjectAssumption[];
  inconsistencies: DocumentInconsistency[];
  evidence: EvidenceRef[];
  exclusions: ProjectExclusion[];
  pendingData: PendingDataItem[];

  /** Regulatorio */
  activeRegulatoryProfileId: string;

  /** Caso base si aplica */
  caseStudyId?: string;  // ej. "bess-del-desierto"
}

export interface LayoutZone {
  id: string;
  type:
    | "bess_block"
    | "road"
    | "cable_corridor"
    | "maintenance"
    | "fire_setback"
    | "exclusion"
    | "mv_yard"
    | "poi_yard";
  polygon: LocalPoint[];
  widthM?: number;
  evidence?: EvidenceRef[];
}

export interface ProjectAssumption {
  id: string;
  description: string;
  value?: number | string | boolean;
  unit?: string;
  confidence: EvidenceConfidence;
  risk: "low" | "medium" | "high";
  mustVerifyBeforeIFC: boolean;
  evidence: EvidenceRef[];
}

export interface ProjectExclusion {
  id: string;
  topic: string;     // "Cortocircuito", "Malla de tierra", etc.
  reason: string;
  recommendation: string;
}

export interface PendingDataItem {
  id: string;
  description: string;
  affectedField: string;     // ej. "BatteryContainer.dimensionsM"
  whereToFind: string;        // ej. "Sungrow installation manual"
  priority: "critical" | "high" | "medium" | "low";
}

export interface DocumentInconsistency {
  id: string;
  topic: string;                       // ej. "Modelo container"
  conflictingValues: { value: string; evidence: EvidenceRef }[];
  recommendation: string;              // ej. "Confirmar con fabricante"
  resolvedValue?: string;
  resolvedBy?: EvidenceRef;
}
```

---

## 3. Catálogo de equipos extendido

```ts
// src/types/equipment.ts (EXTENDER existente)

export interface EquipmentSpec {  // YA EXISTE — añadir campos
  id: string;
  type: EquipmentType;
  manufacturer: string;
  model: string;
  footprint: { length_m: number; width_m: number; height_m?: number };
  mass?: { weight_kg: number };

  // NUEVO: clearances obligatorios para validar layout
  clearances?: {
    front_m?: EvidencedValue<number>;
    back_m?: EvidencedValue<number>;
    side_m?: EvidencedValue<number>;
    /** Separación contra otro equipo del mismo tipo */
    sameType_m?: EvidencedValue<number>;
    /** Separación contra equipo distinto */
    otherType_m?: EvidencedValue<number>;
    /** Zona libre superior */
    overhead_m?: EvidencedValue<number>;
    /** Zona libre frontal para mantenimiento / acceso */
    maintenance_m?: EvidencedValue<number>;
    /** Zona libre para incendio (fire setback) */
    fire_m?: EvidencedValue<number>;
  };

  electrical?: {
    energy_mwh_dc_bol?: EvidencedValue<number>;
    apparent_power_mva?: EvidencedValue<number>;
    dc_voltage_min_v?: EvidencedValue<number>;
    dc_voltage_max_v?: EvidencedValue<number>;
    lv_voltage_kv?: EvidencedValue<number>;
    mv_voltage_kv?: EvidencedValue<number>;
    frequency_hz?: EvidencedValue<number>;
    efficiency_converter_pct?: EvidencedValue<number>;
    efficiency_total_pct?: EvidencedValue<number>;
  };

  environmental?: {
    operating_temp_min_c?: EvidencedValue<number>;
    operating_temp_max_c?: EvidencedValue<number>;
    derating_above_c?: EvidencedValue<number>;
    humidity_min_pct?: EvidencedValue<number>;
    humidity_max_pct?: EvidencedValue<number>;
    max_altitude_m?: EvidencedValue<number>;
  };

  // NUEVO: niveles internos batería (opcional, solo para containers BESS)
  batteryHierarchy?: BatteryHierarchy;

  source: {
    reliability: SourceReliability;  // YA EXISTE
    notes?: string;                  // YA EXISTE
    /** NUEVO: referencias documentales formales */
    evidence: EvidenceRef[];
  };

  compliance?: {
    standards?: string[];   // "UL 9540", "UL 9540A", "NFPA 855"
    certifications?: EvidenceRef[];
  };
}

export interface BatteryHierarchy {
  cellsPerModule?: number;
  modulesPerRack?: number;
  racksPerContainer?: number;
  cellWh?: number;
  cellVoltageNominalV?: number;
  cellChemistry?: "LFP" | "NMC" | "LTO";
  cycleLife?: number;
  cellEfficiencyPct?: number;
}
```

---

## 4. Layout físico (Capa 1)

```ts
// src/types/cable.ts (NUEVO)

export interface CableRoute {
  id: string;
  voltageLevel: "DC" | "BT" | "MT" | "AT";
  voltageKv?: number;
  fromEntityId: string;
  toEntityId: string;

  /** Ruta como serie de puntos locales */
  path: LocalPoint[];
  /** Ancho del corredor (incluye margen) */
  corridorWidth_m: number;

  cableType?: string;                // "AL/XLPE/CWS/HDPE 18/33 (36) kV"
  conductorMaterial?: "Al" | "Cu";
  sectionMm2?: number;
  circuitsPerPhase?: number;
  estimatedLength_m?: number;       // calculado
  installMethod?: "buried" | "ductbank" | "tray" | "overhead" | "unknown";

  evidence: EvidenceRef[];
}

// src/types/road.ts (NUEVO)

export interface AccessRoad {
  id: string;
  type: "perimeter" | "internal" | "access" | "crane_lay_down" | "turning_radius";
  centerLine: LocalPoint[];
  width_m: number;
  turningRadius_m?: number;
  surface?: "compacted" | "concrete" | "asphalt" | "gravel" | "unknown";
  evidence: EvidenceRef[];
}

// src/types/safety.ts (NUEVO)

export interface FireSafetyZone {
  id: string;
  type: "container_separation" | "boundary_setback" | "fire_break" | "water_supply" | "egress";
  polygon: LocalPoint[];
  triggeredBy?: string;   // id del equipo que la genera
  separation_m?: EvidencedValue<number>;
  /** Norma que la origina (NFPA 855, RPTD 08, etc.) */
  basis?: EvidenceRef[];
}
```

---

## 5. Arquitectura eléctrica (Capa 2)

```ts
// src/types/electrical.ts (NUEVO archivo)

/** Estación de conversión (PCS + transformador integrado, ej. SC5000UD-MV) */
export interface ConversionStation {
  id: string;
  manufacturer: string;
  model: string;                  // "SC5000UD-MV"
  ratedPowerMVA: EvidencedValue<number>;

  /** Módulos PCS internos (ej. 2 x 2.5 MVA) */
  pcsModules: PCSModule[];

  /** Transformador bloque (ej. 0.9 → 33 kV, Dy11) */
  blockTransformer: BlockTransformer;

  /** Containers asociados (default 8 por SC5000UD-MV) */
  associatedContainerIds: string[];

  /** Layout: posición y orientación */
  layoutPosition?: { x_m: number; y_m: number; rotation_deg: number };

  /** Feeder MT al que se conecta */
  mvFeederId?: string;

  evidence: EvidenceRef[];
}

export interface PCSModule {
  id: string;
  manufacturer: string;
  model: string;
  apparentPowerMVA: number;
  nominalAcVoltageV: number;
  dcVoltageRangeV?: [number, number];
  maxDcCurrentA?: number;
  maxEfficiencyPct?: number;
}

export interface BlockTransformer {
  id: string;
  ratedPowerMVA: EvidencedValue<number>;
  hvVoltageKv: EvidencedValue<number>;
  lvVoltageKv: EvidencedValue<number>;
  vectorGroup: string;            // "Dy11"
  cooling: string;                // "ONAN", "ONAF"
  positiveSequenceReactancePct?: EvidencedValue<number>;
  positiveSequenceResistancePct?: EvidencedValue<number>;
  loadLossKw?: EvidencedValue<number>;
  noLoadLossKw?: EvidencedValue<number>;
  tapPositions?: string;
}

/** Feeder colector MT (33 kV típicamente) */
export interface MVFeeder {
  id: string;
  nominalVoltageKv: number;
  /** Potencia máxima del feeder (ej. 20 MVA por agrupación de 4 stations) */
  ratedPowerMVA?: number;
  conversionStationIds: string[];
  cableRouteIds: string[];
  mvBusId: string;
  evidence?: EvidenceRef[];
}

/** Barra MT / centro de seccionamiento (BP5, BP6, CS) */
export interface MVBus {
  id: string;
  name: string;                   // "BP5", "BP6", "CS"
  nominalVoltageKv: number;
  feederIds: string[];
  switchgear?: SwitchgearSummary;
  layoutZoneId?: string;          // referencia a LayoutZone tipo "mv_yard"
}

export interface SwitchgearSummary {
  manufacturer?: string;
  model?: string;
  ratedVoltageKv?: number;
  busbarCurrentA?: number;
  cellCount?: number;
  hasBusCoupler?: boolean;
  dimensions_m?: { length: number; width: number; height: number };
  evidence?: EvidenceRef[];
}

/** Point Of Interconnection */
export interface POI {
  id: string;
  voltageKv: number;
  busName: string;                // "BP5/BP6 33 kV"
  /** Frontera de medición y reporte */
  boundary: "mv_33kv" | "hv_220kv" | "external";
  meteringPoints?: MeteringPoint[];
  evidence?: EvidenceRef[];
}

export interface MeteringPoint {
  id: string;
  type: "CT" | "PT" | "meter" | "scada";
  measured: Array<"P" | "Q" | "V" | "I" | "frequency" | "SOC">;
  locationDescription: string;
}

/** Transformador principal (frontera AT externa) */
export interface MainTransformer {
  id: string;
  manufacturer?: string;
  model?: string;
  ratedPowerMVA: EvidencedValue<number>;
  windings: { hvKv: number; mv1Kv?: number; mv2Kv?: number };
  vectorGroup?: string;
  /** Marcado como externo al alcance app por default */
  scope: "external_reference" | "modeled_in_app";
  evidence?: EvidenceRef[];
}

/** Bloque BESS = agrupación física conceptual (ej. 8 containers + 1 station) */
export interface BESSBlock {
  id: string;
  name?: string;
  containerIds: string[];
  conversionStationId: string;
  layoutPosition?: { x_m: number; y_m: number; rotation_deg: number };
}

/** Servicios auxiliares */
export interface AuxiliaryServices {
  plantFixedKw?: EvidencedValue<number>;
  perConversionStationKw?: EvidencedValue<number>;
  perContainerKw?: EvidencedValue<number>;
  modeSpecific?: {
    charge?: EvidencedValue<number>;
    discharge?: EvidencedValue<number>;
    standby?: EvidencedValue<number>;
    startup?: EvidencedValue<number>;
  };
  breakdown?: {
    hvacKw?: EvidencedValue<number>;
    controlKw?: EvidencedValue<number>;
    pumpingKw?: EvidencedValue<number>;
    fireSystemKw?: EvidencedValue<number>;
    lightingKw?: EvidencedValue<number>;
  };
}

/** Power Plant Controller / SCADA — metadato operacional */
export interface PPC {
  manufacturer?: string;
  developer?: string;
  productName?: string;            // "Bluence"
  controlModes: {
    activePower: boolean;
    reactivePower: boolean;
    powerFactor: boolean;
    voltage: boolean;
    qvDroop: boolean;
    frequency: boolean;
    rampRate: boolean;
  };
  rampRateLimit_mw_per_min?: EvidencedValue<number>;
  communicationProtocols?: string[];  // "Modbus TCP", "IEC 61850", "DNP3"
  evidence?: EvidenceRef[];
}

/** Límites operacionales (mínimo técnico, rampas) — solo reporte */
export interface OperationalLimits {
  minTechnicalChargeMW?: EvidencedValue<number>;
  minTechnicalDischargeMW?: EvidencedValue<number>;
  plantRampUpMWperMin?: EvidencedValue<number>;
  plantRampDownMWperMin?: EvidencedValue<number>;
  inverterRampMWperSec?: EvidencedValue<number>;
}

/** Modelo simplificado de pérdidas */
export interface LossEstimate {
  mode: "charge" | "discharge" | "standby";
  mvLossesMW?: EvidencedValue<number>;
  transformerLossesMW?: EvidencedValue<number>;
  pcsLossesMW?: EvidencedValue<number>;
  totalLossesMW?: EvidencedValue<number>;
}
```

---

## 6. Reglas y validaciones (Capa 3)

```ts
// src/rules/types.ts (NUEVO)

export type RuleSeverity = "blocking" | "warning" | "info" | "checklist" | "out_of_scope";

export type RuleCategory =
  | "physical_layout"
  | "electrical"
  | "regulatory_sec"
  | "regulatory_cne_cen"
  | "regulatory_territorial"
  | "regulatory_environmental"
  | "regulatory_fire_safety"
  | "engineering_detail";

export interface RuleDefinition {
  id: string;
  category: RuleCategory;
  severity: RuleSeverity;
  title: string;
  description: string;
  /** Cita normativa */
  evidence: EvidenceRef[];
  /** Función evaluadora (devuelve violaciones) */
  evaluate: (project: ProjectBESS) => RuleViolation[];
  /** Pertenece a perfil regulatorio activo */
  appliesToProfiles: string[];
}

export interface RuleViolation {
  ruleId: string;
  severity: RuleSeverity;
  message: string;
  affectedEntityIds?: string[];
  remediation?: string;
}
```

---

## 7. Reporte técnico

```ts
// src/lib/report/types.ts (NUEVO)

export interface TechnicalReport {
  metadata: {
    projectName: string;
    generatedAt: string;
    appVersion: string;
    locale: "en" | "es";
    disclaimer: string;  // "Predimensionamiento preliminar — no reemplaza..."
  };
  executiveSummary: ReportSection;
  designIntent: ReportSection;
  equipmentInventory: ReportSection;
  physicalLayout: ReportSection;
  electricalArchitecture: ReportSection;
  auxiliaryServicesAndLosses: ReportSection;
  validationResults: ReportSection;
  assumptions: ProjectAssumption[];
  exclusions: ProjectExclusion[];
  engineeringChecklist: ChecklistItem[];
  pendingData: PendingDataItem[];
  documentInconsistencies: DocumentInconsistency[];
  documentReferences: DocumentRegistryEntry[];
}

export interface ReportSection {
  title: string;
  content: ReportBlock[];
}

export type ReportBlock =
  | { type: "text"; text: string }
  | { type: "kpi_grid"; items: KpiItem[] }
  | { type: "table"; rows: string[][]; headers?: string[] }
  | { type: "single_line_diagram"; data: SingleLineDiagramData }
  | { type: "map_snapshot"; pngDataUrl: string };

export interface KpiItem {
  label: string;
  value: string;
  unit?: string;
  evidence?: EvidenceRef[];
  confidence: EvidenceConfidence;
}

export interface ChecklistItem {
  id: string;
  topic: string;
  required: boolean;
  status: "pending" | "in_progress" | "done" | "n_a";
  responsible?: string;
  note?: string;
}
```

---

## 8. Relaciones entre entidades

```
ProjectBESS
├── designTargets (MW, MWh bruto/usable/comercial, usableFactor)
├── polygon ← SiteArea
├── zones [] ← LayoutZone (bess_block, road, cable_corridor, fire_setback, mv_yard, poi_yard, exclusion)
│
├── placedEquipment [] ← PlacedEquipment → EquipmentSpec (catálogo)
│
├── blocks [] ← BESSBlock
│   ├── containerIds [] → PlacedEquipment con type "battery_container"
│   └── conversionStationId → ConversionStation
│
├── conversionStations [] ← ConversionStation
│   ├── pcsModules [] ← PCSModule
│   ├── blockTransformer ← BlockTransformer
│   ├── associatedContainerIds [] → PlacedEquipment
│   └── mvFeederId → MVFeeder
│
├── mvFeeders [] ← MVFeeder
│   ├── conversionStationIds []
│   ├── cableRouteIds [] → CableRoute
│   └── mvBusId → MVBus
│
├── mvBuses [] ← MVBus
│   ├── feederIds []
│   ├── switchgear ← SwitchgearSummary
│   └── layoutZoneId → LayoutZone(mv_yard)
│
├── poi ← POI → meteringPoints [] ← MeteringPoint
│
├── mainTransformer? ← MainTransformer (scope = "external_reference" por default)
│
├── auxiliaryServices? ← AuxiliaryServices
├── ppc? ← PPC
│
├── cableRoutes [] ← CableRoute (DC, BT, MT, AT)
├── accessRoads [] ← AccessRoad
├── fireSafetyZones [] ← FireSafetyZone
│
├── assumptions [] ← ProjectAssumption
├── inconsistencies [] ← DocumentInconsistency
├── exclusions [] ← ProjectExclusion
├── pendingData [] ← PendingDataItem
├── evidence [] ← EvidenceRef (referencias a documentRegistry)
│
└── activeRegulatoryProfileId → RegulatoryProfile (ya existe)
```

---

## 9. Migración desde el modelo actual

| Cambio | Estrategia |
|---|---|
| `EquipmentSpec` añade `clearances` y `evidence: EvidenceRef[]` | Migración aditiva. Campos opcionales. Equipos existentes siguen funcionando. |
| `PlacedEquipment.sourceReliability` se conserva pero se complementa con `evidence` por dato | Ambos pueden coexistir |
| `SourceReliability` (3 niveles) se conserva como **clasificación general** + `EvidenceConfidence` (5 niveles) como **clasificación por valor** | Coexistir, no son lo mismo |
| `ExportedProject` schema sube de "1.1" a "1.2" con campos nuevos | Mantener retrocompatibilidad lectora |
| `useProjectStore` añade slices: `conversionStations`, `mvFeeders`, `mvBuses`, `poi`, etc. | Slices nuevos, no rompen lo existente |
| `bessRegulatoryProfiles.ts` reglas adquieren `evidence` obligatorio | Crear migración: reglas sin evidence se marcan `confidence = "assumption"` |

---

## 10. Convenciones de campo

- **Sufijos métricos**: `_m`, `_kg`, `_t`, `_mw`, `_mva`, `_mwh`, `_kv`, `_v`, `_hz`, `_c`, `_pct`.
- **Energy**: `_mwh_dc_bol` (existente, beginning of life), `_mwh_dc_eol` (futuro, end of life).
- **Bool flag**: usar `is*` (`isPrimary`) o `has*` (`hasBusCoupler`).
- **Arrays**: plural simple (`feeders`, `containers`, no `feedersList`).
- **IDs**: `nanoid()` para IDs internos. `documentRegistry` usa IDs legibles (`SEC-RGR-06-2024`).
