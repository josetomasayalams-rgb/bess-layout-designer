/**
 * Preset BESS del Desierto — extensión v1.2 (Fase 3).
 *
 * Este archivo añade las **capas eléctricas evidenciadas** que el schema v1.2
 * permite, sin reemplazar el `bessDelDesiertoCaseStudy` legacy (que sigue
 * en `bessDelDesierto.ts` y es consumido por `exportJson`, sizing, etc.).
 *
 * Contenido:
 *   - `designTargets`: 200 MW, 800 MWh comercial, 880,80384 MWh bruto,
 *     `usableFactor` 0,9083.
 *   - 40 `ConversionStation` (PB01..PB40) de 5 MVA, 8 containers cada una.
 *   - 10 `MVFeeder` de 20 MVA con 4 stations cada uno.
 *   - 2 `MVBus` (BP5, BP6) en el centro de seccionamiento 33 kV.
 *   - `POI` 33 kV con CT/PT documentados.
 *   - `MainTransformer` 250/125/125 MVA 220/33/33 kV como `external_reference`
 *     (la inconsistencia 220/230 kV se reporta en `inconsistencies`).
 *   - `AuxiliaryServices` con valores PMAX descarga 1,563 MW y carga 1,3493 MW.
 *   - `PPC` Isotrol Bluence con todos los modos de control.
 *   - `OperationalLimits` con mínimo técnico y rampas.
 *   - `LossEstimate[]` con pérdidas MT PMAX.
 *   - 4 `DocumentInconsistency` (INC-001..INC-004).
 *   - 15 `PendingDataItem` (PEND-D001..PEND-D015).
 *
 * Las citas usan `documentRegistry` IDs primarios:
 *   - `PROJ-BESS-DESIERTO-1129` (Informe Mínimo Técnico)
 *   - `PROJ-BESS-DESIERTO-1092` (Procesos Partida/Detención)
 *   - `PROJ-BESS-DESIERTO-2611` (Potencia Máxima)
 */

import type { EvidenceRef, EvidencedValue } from "@/types/evidence";
import type {
  AuxiliaryServices,
  BlockTransformer,
  BESSBlock,
  ConversionStation,
  LossEstimate,
  MainTransformer,
  MVBus,
  MVFeeder,
  OperationalLimits,
  PCSModule,
  POI,
  PPC,
} from "@/types/electrical";
import type {
  DocumentInconsistency,
  ProjectDesignTargets,
} from "@/types/project";
import type { PendingDataItem } from "@/types/technical";

// ──────────────────────────────────────────────────────────────────
// Referencias documentales reutilizables
// ──────────────────────────────────────────────────────────────────

const D = "PROJ-BESS-DESIERTO-1129" as const;
const D1092 = "PROJ-BESS-DESIERTO-1092" as const;
const D2611 = "PROJ-BESS-DESIERTO-2611" as const;

function ref(
  documentId: string,
  page: number | undefined,
  note?: string
): EvidenceRef {
  return { documentId, page, confidence: "documented", note };
}

function asDocumentedV<T>(
  value: T,
  documentId: string,
  page: number | undefined,
  unit?: string,
  note?: string
): EvidencedValue<T> {
  return {
    value,
    unit,
    evidence: [ref(documentId, page, note)],
  };
}

function asDerivedV<T>(
  value: T,
  note: string,
  unit?: string
): EvidencedValue<T> {
  return {
    value,
    unit,
    evidence: [{ documentId: "__none__", confidence: "derived", note }],
  };
}

function asInferredV<T>(
  value: T,
  note: string,
  unit?: string
): EvidencedValue<T> {
  return {
    value,
    unit,
    evidence: [{ documentId: "__none__", confidence: "inferred", note }],
  };
}

function asMissingV<T>(fallback: T, note: string, unit?: string): EvidencedValue<T> {
  return {
    value: fallback,
    unit,
    evidence: [{ documentId: "__none__", confidence: "missing", note }],
    mustVerifyBeforeIFC: true,
  };
}

// ──────────────────────────────────────────────────────────────────
// Constantes del caso (cantidades canónicas)
// ──────────────────────────────────────────────────────────────────

export const BESS_DESIERTO_CONSTANTS = {
  /** Potencia nominal POI declarada. */
  POWER_MW: 200,
  /** Energía comercial usable declarada. */
  USABLE_ENERGY_COMMERCIAL_MWH: 800,
  /** Energía bruta DC BOL = 320 × 2,752512 MWh. */
  GROSS_ENERGY_MWH: 880.80384,
  /** Factor usable / bruto = 800 / 880,80384. */
  USABLE_FACTOR: 800 / 880.80384,
  /** Energía DC BOL por container. */
  CONTAINER_ENERGY_MWH: 2.752512,
  /** Cantidad total de containers. */
  CONTAINER_COUNT: 320,
  /** Cantidad de estaciones de conversión. */
  STATION_COUNT: 40,
  /** Containers por estación. */
  CONTAINERS_PER_STATION: 8,
  /** Potencia por estación. */
  STATION_POWER_MVA: 5,
  /** Cantidad de feeders MT. */
  FEEDER_COUNT: 10,
  /** Estaciones por feeder. */
  STATIONS_PER_FEEDER: 4,
  /** Potencia agregada por feeder. */
  FEEDER_RATED_MVA: 20,
  /** Tensión colector. */
  COLLECTOR_VOLTAGE_KV: 33,
} as const;

// ──────────────────────────────────────────────────────────────────
// Design targets
// ──────────────────────────────────────────────────────────────────

export const bessDelDesiertoDesignTargets: ProjectDesignTargets = {
  powerMW: asDocumentedV(
    BESS_DESIERTO_CONSTANTS.POWER_MW,
    D,
    6,
    "MW",
    "Potencia nominal POI declarada"
  ),
  usableEnergyCommercialMWh: asDocumentedV(
    BESS_DESIERTO_CONSTANTS.USABLE_ENERGY_COMMERCIAL_MWH,
    D,
    6,
    "MWh",
    "Energía comercial declarada (autonomía 4 h)"
  ),
  grossEnergyMWh: asDerivedV(
    BESS_DESIERTO_CONSTANTS.GROSS_ENERGY_MWH,
    "320 × 2,752512 MWh por container (DOC-1129 p.15)",
    "MWh"
  ),
  usableFactor: asDerivedV(
    BESS_DESIERTO_CONSTANTS.USABLE_FACTOR,
    "800 / 880,80384"
  ),
  durationHours: 4,
};

// ──────────────────────────────────────────────────────────────────
// PCS modules y BlockTransformer plantilla
// ──────────────────────────────────────────────────────────────────

function buildPcsModules(stationLabel: string): PCSModule[] {
  return Array.from({ length: 2 }, (_, i) => ({
    id: `${stationLabel}-pcs-${i + 1}`,
    manufacturer: "Sungrow",
    model: "SC5000UD-MV (PCS module)",
    apparentPowerMVA: 2.5,
    nominalAcVoltageV: 900,
    dcVoltageRangeV: [1300, 1500],
    maxEfficiencyPct: 99.0,
  }));
}

function buildBlockTransformer(stationLabel: string): BlockTransformer {
  return {
    id: `${stationLabel}-tx`,
    ratedPowerMVA: asDocumentedV(
      BESS_DESIERTO_CONSTANTS.STATION_POWER_MVA,
      D,
      16,
      "MVA"
    ),
    hvVoltageKv: asDocumentedV(33, D, 16, "kV"),
    lvVoltageKv: asDocumentedV(
      0.9,
      D,
      16,
      "kV",
      "INC-002: conflicto con datasheet US que reporta 0,69 kV"
    ),
    vectorGroup: "Dy11",
    cooling: "ONAN",
    positiveSequenceReactancePct: asDocumentedV(7.95, D, 16, "%"),
    positiveSequenceResistancePct: asDocumentedV(0.91, D, 16, "%"),
    loadLossKw: asDocumentedV(45, D, 16, "kW"),
    noLoadLossKw: asMissingV(0, "Pendiente datasheet completo", "kW"),
    tapPositions: "±2 × 2,5%",
  };
}

// ──────────────────────────────────────────────────────────────────
// 40 ConversionStation PB01..PB40 con 8 containers cada una
// ──────────────────────────────────────────────────────────────────

function containerId(stationIndex: number, slot: number): string {
  const stationLabel = `pb${String(stationIndex).padStart(2, "0")}`;
  return `container-${stationLabel}-c${slot}`;
}

function stationId(stationIndex: number): string {
  return `station-pb${String(stationIndex).padStart(2, "0")}`;
}

function feederId(feederIndex: number): string {
  return `feeder-${String(feederIndex).padStart(2, "0")}`;
}

export const bessDelDesiertoConversionStations: ConversionStation[] =
  Array.from({ length: BESS_DESIERTO_CONSTANTS.STATION_COUNT }, (_, i) => {
    const stationIndex = i + 1;
    const sid = stationId(stationIndex);
    const feederIndex =
      Math.floor(i / BESS_DESIERTO_CONSTANTS.STATIONS_PER_FEEDER) + 1;
    return {
      id: sid,
      manufacturer: "Sungrow",
      model: "SC5000UD-MV",
      ratedPowerMVA: asDocumentedV(
        BESS_DESIERTO_CONSTANTS.STATION_POWER_MVA,
        D,
        6,
        "MVA",
        `PB${String(stationIndex).padStart(2, "0")} — 5 MVA por estación`
      ),
      pcsModules: buildPcsModules(sid),
      blockTransformer: buildBlockTransformer(sid),
      associatedContainerIds: Array.from(
        { length: BESS_DESIERTO_CONSTANTS.CONTAINERS_PER_STATION },
        (_, slot) => containerId(stationIndex, slot + 1)
      ),
      mvFeederId: feederId(feederIndex),
      evidence: [
        ref(D, 6, "Cantidad y configuración de estaciones declaradas"),
        ref(D, 14, "Configuración 2 × 2,5 MVA por estación"),
        ref(D, 16, "Datos del transformador bloque"),
      ],
    };
  });

// ──────────────────────────────────────────────────────────────────
// 10 MVFeeder, 4 stations cada uno, 20 MVA
// ──────────────────────────────────────────────────────────────────

export const bessDelDesiertoMVFeeders: MVFeeder[] = Array.from(
  { length: BESS_DESIERTO_CONSTANTS.FEEDER_COUNT },
  (_, i) => {
    const feederIndex = i + 1;
    const startStation = i * BESS_DESIERTO_CONSTANTS.STATIONS_PER_FEEDER + 1;
    const stationIds = Array.from(
      { length: BESS_DESIERTO_CONSTANTS.STATIONS_PER_FEEDER },
      (_, j) => stationId(startStation + j)
    );
    return {
      id: feederId(feederIndex),
      nominalVoltageKv: BESS_DESIERTO_CONSTANTS.COLLECTOR_VOLTAGE_KV,
      ratedPowerMVA: BESS_DESIERTO_CONSTANTS.FEEDER_RATED_MVA,
      conversionStationIds: stationIds,
      cableRouteIds: [],
      mvBusId: feederIndex <= 5 ? "bus-bp5" : "bus-bp6",
      evidence: [
        {
          documentId: D,
          page: 13,
          confidence: "inferred",
          note: "Patrón visual del unifilar: 4 PB por circuito de 20 MVA, 10 circuitos al centro de seccionamiento",
        },
      ],
    };
  }
);

// ──────────────────────────────────────────────────────────────────
// MVBus — BP5 y BP6
// ──────────────────────────────────────────────────────────────────

export const bessDelDesiertoMVBuses: MVBus[] = [
  {
    id: "bus-bp5",
    name: "BP5",
    nominalVoltageKv: BESS_DESIERTO_CONSTANTS.COLLECTOR_VOLTAGE_KV,
    feederIds: ["feeder-01", "feeder-02", "feeder-03", "feeder-04", "feeder-05"],
    switchgear: {
      manufacturer: "Siemens (referencial)",
      model: "8DA 40,5 kV GIS",
      ratedVoltageKv: 36,
      hasBusCoupler: true,
      evidence: [
        ref(D, 13, "Centro de seccionamiento con BP5/BP6 y acoplador visibles"),
      ],
    },
    evidence: [ref(D, 13, "Barra BP5 33 kV del centro de seccionamiento")],
  },
  {
    id: "bus-bp6",
    name: "BP6",
    nominalVoltageKv: BESS_DESIERTO_CONSTANTS.COLLECTOR_VOLTAGE_KV,
    feederIds: ["feeder-06", "feeder-07", "feeder-08", "feeder-09", "feeder-10"],
    switchgear: {
      manufacturer: "Siemens (referencial)",
      model: "8DA 40,5 kV GIS",
      ratedVoltageKv: 36,
      hasBusCoupler: true,
      evidence: [
        ref(D, 13, "Centro de seccionamiento con BP5/BP6 y acoplador visibles"),
      ],
    },
    evidence: [ref(D, 13, "Barra BP6 33 kV del centro de seccionamiento")],
  },
];

// ──────────────────────────────────────────────────────────────────
// POI
// ──────────────────────────────────────────────────────────────────

export const bessDelDesiertoPOI: POI = {
  id: "poi-bess-33kv",
  voltageKv: BESS_DESIERTO_CONSTANTS.COLLECTOR_VOLTAGE_KV,
  busName: "BP5/BP6 33 kV",
  boundary: "mv_33kv",
  meteringPoints: [
    {
      id: "metering-ct",
      type: "CT",
      measured: ["I"],
      locationDescription:
        "Transformadores de corriente en POI 33 kV (DOC-1129 p.12, recuadro rojo)",
    },
    {
      id: "metering-pt",
      type: "PT",
      measured: ["V"],
      locationDescription:
        "Transformadores de potencial en POI 33 kV (DOC-1129 p.12, marco verde)",
    },
  ],
  evidence: [
    ref(D, 6, "POI BESS aguas abajo del transformador principal"),
    ref(D, 13, "Barras BP5/BP6 33 kV en unifilar"),
  ],
};

// ──────────────────────────────────────────────────────────────────
// MainTransformer — frontera externa
// ──────────────────────────────────────────────────────────────────

export const bessDelDesiertoMainTransformer: MainTransformer = {
  id: "main-tx-sol-desierto",
  manufacturer: undefined,
  model: undefined,
  ratedPowerMVA: asDocumentedV(
    250,
    D,
    17,
    "MVA",
    "INC-004: la tabla reporta 250/125/125 MVA pero el texto menciona valores distintos"
  ),
  windings: {
    hvKv: 220,
    mv1Kv: 33,
    mv2Kv: 33,
  },
  vectorGroup: undefined,
  scope: "external_reference",
  evidence: [
    ref(D, 6, "Resumen ejecutivo declara 220/33/33 kV"),
    ref(
      D,
      17,
      "Tabla con 250/125/125 MVA; texto adyacente menciona 230 kV — ver INC-003 y INC-004"
    ),
  ],
};

// ──────────────────────────────────────────────────────────────────
// AuxiliaryServices — valores PMAX del caso
// ──────────────────────────────────────────────────────────────────

export const bessDelDesiertoAuxiliaryServices: AuxiliaryServices = {
  perConversionStationKw: asDocumentedV(
    38.8,
    D2611,
    18,
    "kW",
    "Consumo por centro de transformación en PMAX descarga"
  ),
  plantFixedKw: asDocumentedV(
    11,
    D2611,
    26,
    "kW",
    "Consumo fijo de planta en PMAX descarga"
  ),
  modeSpecific: {
    discharge: asDocumentedV(
      1.563,
      D2611,
      18,
      "MW",
      "SSAA total en PMAX descarga: 40 × 0,0388 + 0,011 = 1,563 MW"
    ),
    charge: asDocumentedV(
      1.3493,
      D2611,
      29,
      "MW",
      "SSAA total en PMAX carga"
    ),
  },
  breakdown: {
    hvacKw: asMissingV(
      0,
      "Desglose HVAC no disponible en informes; pendiente fabricante",
      "kW"
    ),
    controlKw: asMissingV(
      0,
      "Desglose control no disponible",
      "kW"
    ),
    fireSystemKw: asMissingV(
      0,
      "Desglose sistema de incendio no disponible",
      "kW"
    ),
  },
};

// ──────────────────────────────────────────────────────────────────
// PPC — Bluence Isotrol
// ──────────────────────────────────────────────────────────────────

export const bessDelDesiertoPPC: PPC = {
  manufacturer: "Isotrol",
  developer: "Isotrol",
  productName: "Bluence",
  controlModes: {
    activePower: true,
    reactivePower: true,
    powerFactor: true,
    voltage: true,
    qvDroop: true,
    frequency: true,
    rampRate: true,
  },
  rampRateLimit_mw_per_min: asDocumentedV(
    40,
    D1092,
    25,
    "MW/min",
    "Rampa de planta documentada en ensayo PPyD ~38–40 MW/min"
  ),
  communicationProtocols: ["Modbus TCP", "IEC 61850", "DNP3"],
  evidence: [ref(D, 6, "PPC Bluence desarrollado por Isotrol")],
};

// ──────────────────────────────────────────────────────────────────
// OperationalLimits — mínimo técnico y rampas
// ──────────────────────────────────────────────────────────────────

export const bessDelDesiertoOperationalLimits: OperationalLimits = {
  minTechnicalDischargeMW: asDocumentedV(
    1.2677,
    D,
    32,
    "MW",
    "Mínimo técnico descarga reportado en DOC-1129 p.32-34"
  ),
  minTechnicalChargeMW: asDocumentedV(
    -3.8421,
    D,
    25,
    "MW",
    "Mínimo técnico carga reportado en DOC-1129 p.25-27"
  ),
  plantRampUpMWperMin: asDocumentedV(
    40.2,
    D1092,
    25,
    "MW/min",
    "Rampa de subida planta DOC-1092 p.25-36"
  ),
  plantRampDownMWperMin: asDocumentedV(
    38.6,
    D1092,
    25,
    "MW/min",
    "Rampa de bajada planta DOC-1092 p.25-36"
  ),
  inverterRampMWperSec: asDocumentedV(
    5,
    D1092,
    41,
    "MW/s",
    "Rampa de inversor DOC-1092 p.41-48"
  ),
};

// ──────────────────────────────────────────────────────────────────
// LossEstimate — pérdidas MT PMAX
// ──────────────────────────────────────────────────────────────────

export const bessDelDesiertoLossEstimates: LossEstimate[] = [
  {
    mode: "discharge",
    mvLossesMW: asDocumentedV(
      3.7772,
      D2611,
      27,
      "MW",
      "Pérdidas MT en PMAX descarga"
    ),
  },
  {
    mode: "charge",
    mvLossesMW: asDocumentedV(
      3.6813,
      D2611,
      29,
      "MW",
      "Pérdidas MT en PMAX carga"
    ),
  },
];

// ──────────────────────────────────────────────────────────────────
// BESSBlock — agrupación lógica 8 containers + 1 station
// ──────────────────────────────────────────────────────────────────

export const bessDelDesiertoBlocks: BESSBlock[] = Array.from(
  { length: BESS_DESIERTO_CONSTANTS.STATION_COUNT },
  (_, i) => {
    const stationIndex = i + 1;
    return {
      id: `block-pb${String(stationIndex).padStart(2, "0")}`,
      name: `BESS block PB${String(stationIndex).padStart(2, "0")}`,
      containerIds: Array.from(
        { length: BESS_DESIERTO_CONSTANTS.CONTAINERS_PER_STATION },
        (_, slot) => containerId(stationIndex, slot + 1)
      ),
      conversionStationId: stationId(stationIndex),
    };
  }
);

// ──────────────────────────────────────────────────────────────────
// Inconsistencias documentales del caso (INC-001..INC-004)
// ──────────────────────────────────────────────────────────────────

export const bessDelDesiertoInconsistencies: DocumentInconsistency[] = [
  {
    id: "INC-001",
    topic: "Modelo container",
    conflictingValues: [
      {
        value: "ST2752UX",
        evidence: ref(D, 6, "Mayoría de menciones en informes"),
      },
      {
        value: "ST2725UX",
        evidence: ref(D, 14, "Aparición puntual en informe Mínimo Técnico"),
      },
    ],
    recommendation: "Confirmar modelo final con fabricante. App usa ST2752UX por mayoría.",
    resolvedValue: "ST2752UX",
  },
  {
    id: "INC-002",
    topic: "Tensión BT PCS / transformador bloque",
    conflictingValues: [
      {
        value: "0,9 kV",
        evidence: ref(D, 14, "Datos PCS / transformador bloque (mayoría)"),
      },
      {
        value: "0,69 kV",
        evidence: ref(D2611, 8, "Resumen Potencia Máxima"),
      },
    ],
    recommendation:
      "Confirmar con datasheet SC5000UD-MV-US-P3. La app preset usa 0,9 kV por la mayoría documental.",
    resolvedValue: "0,9 kV",
  },
  {
    id: "INC-003",
    topic: "Tensión AT transformador principal",
    conflictingValues: [
      {
        value: "220 kV",
        evidence: ref(D, 6, "Tabla de resumen ejecutivo"),
      },
      {
        value: "230 kV",
        evidence: ref(D, 17, "Texto descriptivo del transformador principal"),
      },
    ],
    recommendation:
      "Confirmar con subestación / EPC. App usa 220 kV por la tabla.",
    resolvedValue: "220 kV",
  },
  {
    id: "INC-004",
    topic: "Potencia transformador principal",
    conflictingValues: [
      {
        value: "250 / 125 / 125 MVA",
        evidence: ref(D, 17, "Tabla de transformador principal"),
      },
      {
        value: "Valores distintos en texto del mismo informe",
        evidence: ref(D, 17, "Texto adyacente a la tabla"),
      },
    ],
    recommendation:
      "Confirmar con subestación / EPC. App registra 250/125/125 como referencia pero marca el campo como pendiente de validación.",
  },
];

// ──────────────────────────────────────────────────────────────────
// PendingDataItem — PEND-D001..PEND-D015
// ──────────────────────────────────────────────────────────────────

/**
 * Mapeo prioridad planning → PendingDataItem type:
 *   crítica → "critical"
 *   alta     → "important"
 *   media    → "important"
 *   baja     → "desirable"
 */
export const bessDelDesiertoPendingDataV12: PendingDataItem[] = [
  {
    id: "PEND-D001",
    topic: "Sungrow ST2752UX dimensiones físicas exactas",
    reason:
      "Sin estas dimensiones el layout es geométricamente falso. La app usa valores aproximados del datasheet US, pendientes de confirmación con el manual de instalación.",
    requiredFor: "conceptual",
    suggestedSource:
      "Sungrow ST2752UX-V15 datasheet completo + manual de instalación oficial.",
    priority: "critical",
  },
  {
    id: "PEND-D002",
    topic: "Peso bruto ST2752UX confirmado",
    reason:
      "Necesario para cálculo de carga civil / grúa. El catálogo usa 26.400 kg referencial.",
    requiredFor: "basic_engineering",
    suggestedSource: "Datasheet completo + manual Sungrow.",
    priority: "important",
  },
  {
    id: "PEND-D003",
    topic: "Clearances de instalación ST2752UX",
    reason:
      "Define densidad de layout (separaciones para mantenimiento, ventilación, incendio).",
    requiredFor: "conceptual",
    suggestedSource: "Manual de instalación / layout guide Sungrow ST2752UX.",
    priority: "critical",
  },
  {
    id: "PEND-D004",
    topic: "HVAC consumo por container ST2752UX",
    reason: "Afecta SSAA y separaciones por ventilación.",
    requiredFor: "basic_engineering",
    suggestedSource: "Datasheet HVAC / system manual Sungrow.",
    priority: "important",
  },
  {
    id: "PEND-D005",
    topic: "Clearances de instalación SC5000UD-MV",
    reason: "Define acceso para mantenimiento de estaciones de conversión.",
    requiredFor: "basic_engineering",
    suggestedSource: "Manual de instalación Sungrow SC5000UD-MV.",
    priority: "important",
  },
  {
    id: "PEND-D006",
    topic: "Configuración DC real SC5000UD-MV",
    reason: "Verificar entradas DC y arreglo eléctrico interno.",
    requiredFor: "basic_engineering",
    suggestedSource: "Datasheet completo + EPC.",
    priority: "important",
  },
  {
    id: "PEND-D007",
    topic: "Switchgear MT centro de seccionamiento — dimensiones",
    reason:
      "Necesario para definir LayoutZone(mv_yard). Hoy se usan dimensiones referenciales Siemens 8DA.",
    requiredFor: "basic_engineering",
    suggestedSource: "EPC / proveedor celdas (Schneider, Siemens, ABB).",
    priority: "important",
  },
  {
    id: "PEND-D008",
    topic: "Transformador principal — datos reales (INC-003 / INC-004)",
    reason:
      "Resolver inconsistencia 220 vs 230 kV y potencia 250 MVA vs valores en texto.",
    requiredFor: "basic_engineering",
    suggestedSource: "Subestación / EPC.",
    priority: "important",
  },
  {
    id: "PEND-D009",
    topic: "HVAC consumo real y desglose",
    reason: "Balance de SSAA por modo de operación.",
    requiredFor: "basic_engineering",
    suggestedSource: "EPC / fabricante HVAC.",
    priority: "important",
  },
  {
    id: "PEND-D010",
    topic: "Sistema contra incendio detallado",
    reason: "Define separaciones HSE entre containers y al perímetro.",
    requiredFor: "basic_engineering",
    suggestedSource: "EPC + HSE + autoridad local + NFPA 855.",
    priority: "important",
  },
  {
    id: "PEND-D011",
    topic: "Confirmación modelo ST2752UX vs ST2725UX (INC-001)",
    reason:
      "Resolver inconsistencia detectada en informes BESS del Desierto. App usa ST2752UX por mayoría.",
    requiredFor: "conceptual",
    suggestedSource: "Sungrow / Atlas Renewable.",
    priority: "critical",
  },
  {
    id: "PEND-D012",
    topic: "Confirmación tensión BT 0,9 vs 0,69 kV (INC-002)",
    reason: "Resolver inconsistencia documental del caso.",
    requiredFor: "basic_engineering",
    suggestedSource: "Datasheet SC5000UD-MV + EPC.",
    priority: "important",
  },
  {
    id: "PEND-D013",
    topic: "Confirmación tensión AT 220 vs 230 kV (INC-003)",
    reason: "Resolver inconsistencia documental del caso.",
    requiredFor: "basic_engineering",
    suggestedSource: "Subestación / EPC.",
    priority: "important",
  },
  {
    id: "PEND-D014",
    topic: "Plano de layout general georreferenciado",
    reason:
      "Validar densidad real y compatibilidad con polígono terreno. No existe CAD nativo en la documentación recibida.",
    requiredFor: "conceptual",
    suggestedSource: "EPC / Atlas Renewable.",
    priority: "critical",
  },
  {
    id: "PEND-D015",
    topic: "Archivos DWG/DXF nativos BESS del Desierto",
    reason: "Para importador CAD futuro y validación de rutas / accesos.",
    requiredFor: "detail_engineering",
    suggestedSource: "EPC.",
    priority: "desirable",
  },
];

// ──────────────────────────────────────────────────────────────────
// Bundle exportable — facilita la carga en el store en fases futuras
// ──────────────────────────────────────────────────────────────────

export type BessDelDesiertoPresetV12 = {
  caseStudyId: "bess-del-desierto";
  designTargets: ProjectDesignTargets;
  blocks: BESSBlock[];
  conversionStations: ConversionStation[];
  mvFeeders: MVFeeder[];
  mvBuses: MVBus[];
  poi: POI;
  mainTransformer: MainTransformer;
  auxiliaryServices: AuxiliaryServices;
  ppc: PPC;
  operationalLimits: OperationalLimits;
  lossEstimates: LossEstimate[];
  inconsistencies: DocumentInconsistency[];
  pendingDataV12: PendingDataItem[];
};

export const bessDelDesiertoPresetV12: BessDelDesiertoPresetV12 = {
  caseStudyId: "bess-del-desierto",
  designTargets: bessDelDesiertoDesignTargets,
  blocks: bessDelDesiertoBlocks,
  conversionStations: bessDelDesiertoConversionStations,
  mvFeeders: bessDelDesiertoMVFeeders,
  mvBuses: bessDelDesiertoMVBuses,
  poi: bessDelDesiertoPOI,
  mainTransformer: bessDelDesiertoMainTransformer,
  auxiliaryServices: bessDelDesiertoAuxiliaryServices,
  ppc: bessDelDesiertoPPC,
  operationalLimits: bessDelDesiertoOperationalLimits,
  lossEstimates: bessDelDesiertoLossEstimates,
  inconsistencies: bessDelDesiertoInconsistencies,
  pendingDataV12: bessDelDesiertoPendingDataV12,
};

// Marcar `asInferredV` como usado (helper público para construcción futura).
export { asInferredV };
