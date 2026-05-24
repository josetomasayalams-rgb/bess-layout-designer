/**
 * Catálogo de cables MT (referencia).
 *
 * Estos entries son **datasheets de referencia** — no son los cables exactos
 * usados en ningún proyecto. Sirven para parametrizar `CableRoute` con
 * valores realistas y como soporte de búsqueda en el reporte.
 *
 * Política:
 * - Cada entry cita su PDF de referencia en el DocumentRegistry.
 * - Valores específicos (ampacidad, peso) que no se han leído del PDF
 *   están marcados como `confidence: "missing"` y deben validarse.
 * - El cálculo termoeléctrico definitivo queda fuera del alcance v1.
 */

import type { EvidenceRef } from "@/types/evidence";

export type CableInsulation = "XLPE" | "EPR" | "PVC" | "HDPE" | "UNKNOWN";

export type CableShield = "CWS" | "AL_TAPE" | "CU_WIRE" | "UNARMORED" | "UNKNOWN";

export type CableSheath = "HDPE" | "PVC" | "PE" | "UNKNOWN";

export type MVCableSpec = {
  id: string;
  manufacturer: string;
  model: string;
  /** Tensión nominal U0/U (kV) del aislamiento. Ej. 18/30, 19/33. */
  ratedVoltageU0U: string;
  /** Tensión máxima del sistema (kV). Para BESS Chile 33 kV → Um=36. */
  maxSystemVoltageKv: number;
  conductorMaterial: "Al" | "Cu";
  /** Secciones disponibles (mm²) según datasheet. */
  availableSectionsMm2: number[];
  insulation: CableInsulation;
  shield: CableShield;
  sheath: CableSheath;
  /** Aplicable a colectores MT 33 kV. */
  applicableToMV33kV: boolean;
  evidence: EvidenceRef[];
  notes?: string;
};

export const mvCablesCatalog: readonly MVCableSpec[] = [
  {
    id: "hes-al-xlpe-cws-18-30",
    manufacturer: "HES",
    model: "AL/XLPE/CWS 18/30 (19/33) kV",
    ratedVoltageU0U: "18/30 (19/33)",
    maxSystemVoltageKv: 36,
    conductorMaterial: "Al",
    availableSectionsMm2: [70, 95, 120, 150, 185, 240, 300, 400, 500, 630],
    insulation: "XLPE",
    shield: "CWS",
    sheath: "PVC",
    applicableToMV33kV: true,
    evidence: [
      {
        documentId: "PROJ-BESS-DESIERTO-1129",
        page: 13,
        confidence: "documented",
        note: "Cable etiquetado en unifilar 33 kV del informe Mínimo Técnico",
      },
    ],
    notes:
      "Datasheet de referencia. Ampacidad, radio de curvatura y compatibilidad con zanja agrupada quedan pendientes hasta lectura del PDF HES.",
  },
  {
    id: "nexans-al-xlpe-tr-pe-18-30-630",
    manufacturer: "Nexans",
    model: "AL/XLPE/TR/PE 18/30 kV 630 mm²",
    ratedVoltageU0U: "18/30",
    maxSystemVoltageKv: 36,
    conductorMaterial: "Al",
    availableSectionsMm2: [630],
    insulation: "XLPE",
    shield: "CU_WIRE",
    sheath: "PE",
    applicableToMV33kV: true,
    evidence: [
      {
        documentId: "PROJ-BESS-DESIERTO-1129",
        page: 13,
        confidence: "documented",
        note: "Referencia presente en biblioteca documental BESS del Desierto",
      },
    ],
  },
  {
    id: "nexans-na2xs2y-19-33-630-hdpe",
    manufacturer: "Nexans",
    model: "NA2XS2Y 19/33 kV 630 mm² HDPE",
    ratedVoltageU0U: "19/33",
    maxSystemVoltageKv: 36,
    conductorMaterial: "Al",
    availableSectionsMm2: [630],
    insulation: "XLPE",
    shield: "CU_WIRE",
    sheath: "HDPE",
    applicableToMV33kV: true,
    evidence: [
      {
        documentId: "NEXANS-NA2XS2Y-19-33",
        confidence: "documented",
        note: "Datasheet referencial Nexans",
      },
    ],
  },
  {
    id: "prysmian-na2xs-fl-2y-19-33",
    manufacturer: "Prysmian",
    model: "NA2XS(FL)2Y 19/33 kV",
    ratedVoltageU0U: "19/33",
    maxSystemVoltageKv: 36,
    conductorMaterial: "Al",
    availableSectionsMm2: [95, 150, 240, 300, 400, 500, 630],
    insulation: "XLPE",
    shield: "CU_WIRE",
    sheath: "PE",
    applicableToMV33kV: true,
    evidence: [
      {
        documentId: "PROJ-BESS-DESIERTO-1129",
        page: 13,
        confidence: "documented",
        note: "Referencia presente en biblioteca documental BESS del Desierto",
      },
    ],
  },
];

export function findMVCable(id: string): MVCableSpec | undefined {
  return mvCablesCatalog.find((c) => c.id === id);
}

export function cablesForMV33kV(): readonly MVCableSpec[] {
  return mvCablesCatalog.filter((c) => c.applicableToMV33kV);
}
