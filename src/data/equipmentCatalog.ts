import { bessModelEquipmentSpecs } from "@/data/bessModels";
import { technicalEquipmentSpecs } from "@/data/catalogs";
import type { Equipment3DVisualProfileId } from "@/data/equipment3dVisualProfiles";
import type { DataClassification } from "@/types/technical";
import type { EvidenceRef, EvidencedValue } from "@/types/evidence";

export type SourceReliability = DataClassification;

/**
 * Clearances obligatorios para validar layout (todos opcionales).
 *
 * Cada campo es un `EvidencedValue<number>` para citar el datasheet o manual
 * de instalación que lo respalda. Valores ausentes deben aparecer como
 * `PendingDataItem` en el proyecto.
 */
export type EquipmentClearances = {
  /** Espacio libre frontal (acceso, mantenimiento). */
  front_m?: EvidencedValue<number>;
  /** Espacio libre trasero. */
  back_m?: EvidencedValue<number>;
  /** Espacio libre lateral. */
  side_m?: EvidencedValue<number>;
  /** Separación mínima contra otro equipo del mismo tipo. */
  sameType_m?: EvidencedValue<number>;
  /** Separación mínima contra otro equipo distinto. */
  otherType_m?: EvidencedValue<number>;
  /** Zona libre superior (overhead). */
  overhead_m?: EvidencedValue<number>;
  /** Zona libre frontal para mantenimiento / acceso. */
  maintenance_m?: EvidencedValue<number>;
  /** Zona libre por incendio (fire setback). */
  fire_m?: EvidencedValue<number>;
};

/** Cumplimiento de estándares y certificaciones. */
export type EquipmentCompliance = {
  /** Estándares declarados (texto: "UL 9540", "NFPA 855", "IEC 62619"). */
  standards?: string[];
  /** Certificaciones con cita documental. */
  certifications?: EvidenceRef[];
};

/** Niveles internos de batería (opcional, sólo para containers BESS). */
export type BatteryHierarchy = {
  cellsPerModule?: number;
  modulesPerRack?: number;
  racksPerContainer?: number;
  cellWh?: number;
  cellVoltageNominalV?: number;
  cellChemistry?: "LFP" | "NMC" | "LTO";
  cycleLife?: number;
  cellEfficiencyPct?: number;
  cellManufacturer?: string;
};

export type EquipmentType =
  | "battery_container"
  | "pcs_mv_station"
  | "mv_transformer"
  | "cable_trench"
  | "access_road"
  | "substation_area";

export type EquipmentSpec = {
  id: string;
  type: EquipmentType;
  manufacturer: string;
  model: string;
  label: string;
  /** Optional 3D visualization metadata (no effect on layout geometry). */
  has3DModel?: boolean;
  visualProfile?: Equipment3DVisualProfileId;
  footprint: {
    length_m: number;
    width_m: number;
    height_m?: number;
  };
  mass?: {
    weight_kg: number;
  };
  electrical?: {
    energy_mwh_dc_bol?: number;
    apparent_power_mva?: number;
    dc_voltage_min_v?: number;
    dc_voltage_max_v?: number;
    lv_voltage_kv?: number;
    mv_voltage_kv?: number;
    frequency_hz?: number;
    efficiency_converter_pct?: number;
    efficiency_total_pct?: number;
  };
  environmental?: {
    operating_temp_min_c?: number;
    operating_temp_max_c?: number;
    derating_above_c?: number;
    humidity_min_pct?: number;
    humidity_max_pct?: number;
    max_altitude_m?: number;
    cooling?: string;
    protection?: string;
  };
  communications?: {
    interfaces?: string[];
    protocols?: string[];
  };
  /**
   * Clearances de instalación (datasheet / manual del fabricante).
   * Cuando ausentes, el spec debe reportar `PendingDataItem` en el proyecto.
   */
  clearances?: EquipmentClearances;
  /** Estándares y certificaciones declaradas. */
  compliance?: EquipmentCompliance;
  /** Niveles internos de batería (sólo containers BESS). */
  batteryHierarchy?: BatteryHierarchy;
  source: {
    reliability: SourceReliability;
    title: string;
    notes: string;
    /**
     * Referencias documentales formales (Fase 1+). Opcional para
     * retrocompatibilidad: equipos cargados sin `evidence` siguen funcionando
     * y se consideran respaldados sólo por `reliability` + `notes`.
     */
    evidence?: EvidenceRef[];
  };
};

// Referencias documentales reutilizadas en los specs base (Fase 2).
// Citan documentRegistry entries primarias.
const REF_ST2752UX_V15: EvidenceRef = {
  documentId: "SUNGROW-ST2752UX-V15",
  confidence: "documented",
};
const REF_ST2752UX_MANUAL_V12: EvidenceRef = {
  documentId: "SUNGROW-ST2752UX-MANUAL-V12",
  confidence: "documented",
};
const REF_SC5000UDMV_US: EvidenceRef = {
  documentId: "SUNGROW-SC5000UD-MV-US",
  confidence: "documented",
};
const REF_SC5000UDMV_V15: EvidenceRef = {
  documentId: "SUNGROW-SC5000UD-MV-V15",
  confidence: "documented",
};
const REF_PROJ_DESIERTO_MT: EvidenceRef = {
  documentId: "PROJ-BESS-DESIERTO-1129",
  confidence: "documented",
  note: "Información reportada en informe Mínimo Técnico BESS del Desierto",
};
const REF_PT2_WP_2024: EvidenceRef = {
  documentId: "SUNGROW-PT2-WP-2024",
  confidence: "documented",
};
const REF_UL_9540: EvidenceRef = {
  documentId: "UL-9540",
  confidence: "documented",
  note: "Conformidad declarada en datasheet del fabricante",
};
const REF_UL_9540A: EvidenceRef = {
  documentId: "UL-9540A-SWRI",
  confidence: "documented",
  note: "Test de propagación térmica SwRI declarado en whitepaper PT2",
};
const REF_NFPA_855: EvidenceRef = {
  documentId: "NFPA-855",
  confidence: "documented",
  note: "Conformidad declarada en datasheet del fabricante",
};

const baseEquipmentCatalog: EquipmentSpec[] = [
  {
    id: "sungrow-st2752ux-us",
    type: "battery_container",
    manufacturer: "Sungrow",
    model: "ST2752UX-US",
    label: "Sungrow ST2752UX-US Battery Container",
    has3DModel: true,
    visualProfile: "sungrow_container_v1",
    footprint: {
      length_m: 9.34,
      width_m: 1.73,
      height_m: 2.6,
    },
    mass: {
      weight_kg: 26400,
    },
    electrical: {
      energy_mwh_dc_bol: 2.752,
      dc_voltage_min_v: 1160,
      dc_voltage_max_v: 1500,
    },
    environmental: {
      operating_temp_min_c: -30,
      operating_temp_max_c: 50,
      derating_above_c: 45,
      humidity_min_pct: 0,
      humidity_max_pct: 95,
      max_altitude_m: 3000,
      cooling: "Liquid cooling",
      protection: "IP54 / Type 3R",
    },
    communications: {
      interfaces: ["RS485", "Ethernet"],
      protocols: ["Modbus RTU", "Modbus TCP"],
    },
    // Fase 2: clearances pendientes hasta manual de instalación oficial.
    clearances: {
      sameType_m: {
        value: 0,
        unit: "m",
        evidence: [
          {
            documentId: "__none__",
            confidence: "missing",
            note: "Pendiente de manual de instalación Sungrow ST2752UX",
          },
        ],
        mustVerifyBeforeIFC: true,
      },
      maintenance_m: {
        value: 0,
        unit: "m",
        evidence: [
          {
            documentId: "__none__",
            confidence: "missing",
            note: "Pendiente de layout guide Sungrow",
          },
        ],
        mustVerifyBeforeIFC: true,
      },
      fire_m: {
        value: 0,
        unit: "m",
        evidence: [
          {
            documentId: "__none__",
            confidence: "missing",
            note: "Sungrow PT2 whitepaper declara extinción interna; separación externa requiere NFPA 855 + autoridad local",
          },
        ],
        mustVerifyBeforeIFC: true,
      },
    },
    compliance: {
      standards: ["UL 9540", "UL 9540A", "NFPA 855"],
      certifications: [REF_UL_9540, REF_UL_9540A, REF_NFPA_855],
    },
    // Niveles internos según informe BESS del Desierto (DOC-1129 p.15/p.55).
    batteryHierarchy: {
      cellsPerModule: 64,
      modulesPerRack: 6,
      racksPerContainer: 8,
      cellWh: 896,
      cellVoltageNominalV: 3.2,
      cellChemistry: "LFP",
      cycleLife: 6500,
      cellEfficiencyPct: 92.5,
      cellManufacturer: "CATL",
    },
    source: {
      reliability: "certified_data",
      title: "Sungrow ST2752UX-US Datasheet V15",
      notes:
        "Datasheet reports dimensions as W x H x D = 9340 x 2600 x 1730 mm. For plan layout this app uses footprint 9.34 m x 1.73 m and height 2.60 m.",
      evidence: [
        REF_ST2752UX_V15,
        REF_ST2752UX_MANUAL_V12,
        REF_PROJ_DESIERTO_MT,
        REF_PT2_WP_2024,
      ],
    },
  },
  {
    id: "sungrow-sc5000ud-mv-us-p3",
    type: "pcs_mv_station",
    manufacturer: "Sungrow",
    model: "SC5000UD-MV-US-P3",
    label: "Sungrow SC5000UD-MV-US-P3 MV Power Converter",
    has3DModel: true,
    visualProfile: "sungrow_pcs_v1",
    footprint: {
      length_m: 6.058,
      width_m: 2.438,
      height_m: 2.896,
    },
    mass: {
      weight_kg: 17000,
    },
    electrical: {
      apparent_power_mva: 5,
      dc_voltage_min_v: 1000,
      dc_voltage_max_v: 1500,
      lv_voltage_kv: 0.69,
      mv_voltage_kv: 34.5,
      frequency_hz: 60,
      efficiency_converter_pct: 99.0,
      efficiency_total_pct: 98.3,
    },
    environmental: {
      operating_temp_min_c: -35,
      operating_temp_max_c: 60,
      derating_above_c: 45,
      humidity_min_pct: 0,
      humidity_max_pct: 100,
      max_altitude_m: 1000,
      cooling: "Forced air cooling + KNAN",
      protection: "Type 3R",
    },
    communications: {
      interfaces: ["RS485", "CAN", "Ethernet", "Optical Fiber"],
    },
    clearances: {
      sameType_m: {
        value: 0,
        unit: "m",
        evidence: [
          {
            documentId: "__none__",
            confidence: "missing",
            note: "Pendiente de manual de instalación SC5000UD-MV",
          },
        ],
        mustVerifyBeforeIFC: true,
      },
      maintenance_m: {
        value: 0,
        unit: "m",
        evidence: [
          {
            documentId: "__none__",
            confidence: "missing",
            note: "Pendiente de layout guide Sungrow",
          },
        ],
        mustVerifyBeforeIFC: true,
      },
    },
    compliance: {
      standards: ["IEC 62477-1", "IEEE 1547", "UL 1741"],
    },
    source: {
      reliability: "certified_data",
      title: "Sungrow SC5000UD-MV-US-P3 Datasheet",
      notes:
        "Datasheet reports dimensions as W x H x D = 6058 x 2896 x 2438 mm. For plan layout this app uses footprint 6.058 m x 2.438 m and height 2.896 m. Conocida inconsistencia documental: el datasheet US nombra LV = 0,69 kV (representado aquí); los informes BESS del Desierto a veces citan 0,9 kV — ver inconsistencia INC-002.",
      evidence: [
        REF_SC5000UDMV_US,
        REF_SC5000UDMV_V15,
        REF_PROJ_DESIERTO_MT,
      ],
    },
  },
];

export const equipmentCatalog: EquipmentSpec[] = [
  ...bessModelEquipmentSpecs,
  ...technicalEquipmentSpecs,
  ...baseEquipmentCatalog,
];

/**
 * True when a spec has 3D-visualization data (height + opt-in).
 *
 * MVP rule: explicit `has3DModel: true` OR a Sungrow spec that ships with a
 * datasheet height. This keeps the activation controlled while letting future
 * specs opt-in by simply setting `has3DModel: true` in the catalog.
 */
export function is3DCapable(spec: EquipmentSpec): boolean {
  const heightM = spec.footprint.height_m;
  if (!heightM || heightM <= 0) return false;
  if (spec.has3DModel === true) return true;
  return /sungrow/i.test(spec.manufacturer);
}
