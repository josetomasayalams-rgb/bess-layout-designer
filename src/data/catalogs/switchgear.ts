/**
 * Catálogo de switchgear MT (referencia).
 *
 * Estos entries cubren el centro de seccionamiento 33 kV y celdas asociadas
 * en sistemas BESS utility. Son **referencias** del catálogo del fabricante
 * — la selección final depende del diseño eléctrico de detalle.
 *
 * Política:
 * - Cada entry cita su PDF de referencia en el DocumentRegistry.
 * - Dimensiones por celda son aproximadas; el footprint del yard MT debe
 *   tomarse del proyecto, no de este catálogo.
 */

import type { EvidenceRef } from "@/types/evidence";

export type SwitchgearTechnology = "GIS" | "AIS" | "VIS" | "UNKNOWN";

export type SwitchgearSpec = {
  id: string;
  manufacturer: string;
  model: string;
  technology: SwitchgearTechnology;
  ratedVoltageKv: number;
  /** Tensión máxima del sistema (kV). */
  maxSystemVoltageKv: number;
  /** Corriente nominal de barra (A). */
  busbarCurrentA?: number;
  /** Corriente de cortocircuito de corta duración (kA, 1 s o 3 s). */
  shortCircuitWithstandKa?: number;
  /** Dimensiones aproximadas por cubículo (m). */
  cellDimensions_m?: {
    width_m: number;
    depth_m: number;
    height_m: number;
  };
  applicableToBESSMV33kV: boolean;
  evidence: EvidenceRef[];
  notes?: string;
};

export const mvSwitchgearCatalog: readonly SwitchgearSpec[] = [
  {
    id: "siemens-8da-40p5",
    manufacturer: "Siemens",
    model: "8DA (GIS) 40.5 kV",
    technology: "GIS",
    ratedVoltageKv: 36,
    maxSystemVoltageKv: 40.5,
    busbarCurrentA: 2500,
    shortCircuitWithstandKa: 31.5,
    cellDimensions_m: {
      width_m: 0.6,
      depth_m: 1.5,
      height_m: 2.45,
    },
    applicableToBESSMV33kV: true,
    evidence: [
      {
        documentId: "SIEMENS-8DA-8DB-40p5",
        confidence: "documented",
        note: "Catálogo de referencia Siemens 8DA/8DB 40,5 kV GIS",
      },
    ],
    notes:
      "Las dimensiones por cubículo provienen del catálogo del fabricante. El número de celdas y la configuración final del centro de seccionamiento dependen del proyecto.",
  },
  {
    id: "siemens-8db-40p5",
    manufacturer: "Siemens",
    model: "8DB (GIS) 40.5 kV",
    technology: "GIS",
    ratedVoltageKv: 36,
    maxSystemVoltageKv: 40.5,
    busbarCurrentA: 4000,
    shortCircuitWithstandKa: 40,
    cellDimensions_m: {
      width_m: 0.8,
      depth_m: 1.7,
      height_m: 2.7,
    },
    applicableToBESSMV33kV: true,
    evidence: [
      {
        documentId: "SIEMENS-8DA-8DB-40p5",
        confidence: "documented",
        note: "Catálogo de referencia Siemens 8DA/8DB 40,5 kV GIS",
      },
    ],
    notes: "Variante de mayor corriente de barra para colectores grandes.",
  },
];

export function findSwitchgear(id: string): SwitchgearSpec | undefined {
  return mvSwitchgearCatalog.find((s) => s.id === id);
}
