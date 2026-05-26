/**
 * Capa eléctrica (Capa 2) del modelo de datos.
 *
 * Estas entidades sirven para representar la arquitectura eléctrica preliminar
 * desde `BatteryContainer` hasta `POI`, incluyendo opcionalmente la frontera AT
 * (`MainTransformer`).
 *
 * Política de evidencia: campos críticos usan `EvidencedValue<T>`; campos de
 * etiqueta y de relación usan tipos planos. Todas las entidades aceptan un
 * arreglo `evidence?: EvidenceRef[]` a nivel raíz para citas adicionales.
 *
 * Todas las entidades son aditivas: por defecto el store las inicializa vacías
 * y la UI v1 puede ignorarlas. La integración con UI llega en fases posteriores.
 */

import type { EvidenceRef, EvidencedValue } from "@/types/evidence";

// ──────────────────────────────────────────────────────────────────
// Bloque BESS — agrupación física conceptual
// ──────────────────────────────────────────────────────────────────

/** Agrupación física conceptual (ej. 8 containers + 1 station). */
export type BESSBlock = {
  id: string;
  name?: string;
  containerIds: string[];
  conversionStationId: string;
  layoutPosition?: {
    x_m: number;
    y_m: number;
    rotation_deg: number;
  };
};

// ──────────────────────────────────────────────────────────────────
// Estación de conversión (PCS + transformador integrado)
// ──────────────────────────────────────────────────────────────────

export type ConversionStation = {
  id: string;
  manufacturer: string;
  model: string;
  ratedPowerMVA: EvidencedValue<number>;
  /** Módulos PCS internos (ej. 2 x 2,5 MVA para SC5000UD-MV). */
  pcsModules: PCSModule[];
  /** Transformador bloque (ej. 0,9 → 33 kV, Dy11). */
  blockTransformer: BlockTransformer;
  /** Containers asociados (default 8 por SC5000UD-MV). */
  associatedContainerIds: string[];
  /** Posición y orientación en el layout. */
  layoutPosition?: {
    x_m: number;
    y_m: number;
    rotation_deg: number;
  };
  /** Feeder MT al que se conecta. */
  mvFeederId?: string;
  evidence?: EvidenceRef[];
};

export type PCSModule = {
  id: string;
  manufacturer: string;
  model: string;
  apparentPowerMVA: number;
  nominalAcVoltageV: number;
  dcVoltageRangeV?: [number, number];
  maxDcCurrentA?: number;
  maxEfficiencyPct?: number;
};

export type BlockTransformer = {
  id: string;
  ratedPowerMVA: EvidencedValue<number>;
  hvVoltageKv: EvidencedValue<number>;
  lvVoltageKv: EvidencedValue<number>;
  vectorGroup: string;
  cooling: string;
  positiveSequenceReactancePct?: EvidencedValue<number>;
  positiveSequenceResistancePct?: EvidencedValue<number>;
  loadLossKw?: EvidencedValue<number>;
  noLoadLossKw?: EvidencedValue<number>;
  tapPositions?: string;
};

// ──────────────────────────────────────────────────────────────────
// Red colectora MT
// ──────────────────────────────────────────────────────────────────

/** Feeder colector MT (33 kV típicamente). */
export type MVFeeder = {
  id: string;
  nominalVoltageKv: number;
  /** Potencia agregada del feeder (ej. 20 MVA para 4 estaciones de 5 MVA). */
  ratedPowerMVA?: number;
  conversionStationIds: string[];
  cableRouteIds: string[];
  mvBusId: string;
  evidence?: EvidenceRef[];
};

/** Barra MT / centro de seccionamiento. */
export type MVBus = {
  id: string;
  name: string;
  nominalVoltageKv: number;
  feederIds: string[];
  switchgear?: SwitchgearSummary;
  /** Referencia a una LayoutZone tipo "mv_yard". */
  layoutZoneId?: string;
  evidence?: EvidenceRef[];
};

export type SwitchgearSummary = {
  manufacturer?: string;
  model?: string;
  ratedVoltageKv?: number;
  /**
   * Fase 8 (T1): trazabilidad explícita del rating de barra MT.
   * Cuando no se conoce con datasheet, debe envolverse en `asMissing(0)`
   * para que `severityCeiling` baje el techo a `checklist`.
   */
  busbarCurrentA?: EvidencedValue<number>;
  cellCount?: number;
  hasBusCoupler?: boolean;
  dimensions_m?: {
    length_m: number;
    width_m: number;
    height_m: number;
  };
  evidence?: EvidenceRef[];
};

// ──────────────────────────────────────────────────────────────────
// POI y medición
// ──────────────────────────────────────────────────────────────────

/** Point Of Interconnection. */
export type POI = {
  id: string;
  voltageKv: number;
  /** Etiqueta del bus (ej. "BP5/BP6 33 kV"). */
  busName: string;
  /** Frontera de medición y reporte. */
  boundary: "mv_33kv" | "hv_220kv" | "external";
  meteringPoints?: MeteringPoint[];
  /**
   * Fase 8 (T3): capacidad declarada del POI (MVA) según informe de
   * conexión o estudio CEN/CNE. Si está ausente, RULE-ELEC-013
   * baja a `checklist` por evidencia faltante.
   */
  declaredCapacityMVA?: EvidencedValue<number>;
  evidence?: EvidenceRef[];
};

export type MeteringPoint = {
  id: string;
  type: "CT" | "PT" | "meter" | "scada";
  measured: Array<"P" | "Q" | "V" | "I" | "frequency" | "SOC">;
  locationDescription: string;
};

// ──────────────────────────────────────────────────────────────────
// Transformador principal (frontera AT externa)
// ──────────────────────────────────────────────────────────────────

export type MainTransformer = {
  id: string;
  manufacturer?: string;
  model?: string;
  ratedPowerMVA: EvidencedValue<number>;
  windings: {
    hvKv: number;
    mv1Kv?: number;
    mv2Kv?: number;
  };
  vectorGroup?: string;
  /** "external_reference" lo marca como fuera del alcance app BESS por defecto. */
  scope: "external_reference" | "modeled_in_app";
  evidence?: EvidenceRef[];
};

// ──────────────────────────────────────────────────────────────────
// Servicios auxiliares (SSAA)
// ──────────────────────────────────────────────────────────────────

export type AuxiliaryServices = {
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
};

// ──────────────────────────────────────────────────────────────────
// Power Plant Controller / SCADA
// ──────────────────────────────────────────────────────────────────

export type PPC = {
  manufacturer?: string;
  developer?: string;
  productName?: string;
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
  communicationProtocols?: string[];
  evidence?: EvidenceRef[];
};

// ──────────────────────────────────────────────────────────────────
// Límites operacionales (sólo reporte)
// ──────────────────────────────────────────────────────────────────

export type OperationalLimits = {
  minTechnicalChargeMW?: EvidencedValue<number>;
  minTechnicalDischargeMW?: EvidencedValue<number>;
  plantRampUpMWperMin?: EvidencedValue<number>;
  plantRampDownMWperMin?: EvidencedValue<number>;
  inverterRampMWperSec?: EvidencedValue<number>;
};

// ──────────────────────────────────────────────────────────────────
// Modelo simplificado de pérdidas
// ──────────────────────────────────────────────────────────────────

export type LossEstimate = {
  mode: "charge" | "discharge" | "standby";
  mvLossesMW?: EvidencedValue<number>;
  transformerLossesMW?: EvidencedValue<number>;
  pcsLossesMW?: EvidencedValue<number>;
  totalLossesMW?: EvidencedValue<number>;
};
