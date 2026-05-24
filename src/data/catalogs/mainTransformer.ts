/**
 * Catálogo de transformadores principales POI (referencia).
 *
 * Estos entries cubren transformadores de potencia AT/MT que sirven como
 * frontera de interconexión del BESS al SEN. Son **referencias** — la
 * selección final depende del estudio de subestación y la potencia
 * solicitada por la coordinación.
 *
 * Política:
 * - Cada entry cita una referencia documental.
 * - Por defecto, en la app el `MainTransformer` se marca como
 *   `scope: "external_reference"` y queda fuera del alcance BESS preliminar.
 * - Si el usuario activa alcance hasta POI AT, este catálogo provee
 *   parámetros base.
 */

import type { EvidenceRef } from "@/types/evidence";

export type TransformerCooling = "ONAN" | "ONAF" | "OFAF" | "ODAF" | "UNKNOWN";

export type MainTransformerSpec = {
  id: string;
  manufacturer: string;
  model: string;
  /** Devanados nominales (kV). */
  windings: {
    hvKv: number;
    mv1Kv?: number;
    mv2Kv?: number;
  };
  /** Potencias nominales por etapa de enfriamiento (MVA). */
  ratedPowersMva: number[];
  cooling: TransformerCooling[];
  vectorGroup?: string;
  impedancePctRange?: [number, number];
  tapChanger?: "OLTC" | "DETC" | "fixed" | "unknown";
  tapRange?: string;
  applicableToBESSPOI: boolean;
  evidence: EvidenceRef[];
  notes?: string;
};

export const mainTransformerCatalog: readonly MainTransformerSpec[] = [
  {
    id: "horizonpower-substation-3w",
    manufacturer: "Horizon Power (ref.)",
    model: "Substation Power Transformer (3-winding referential)",
    windings: {
      hvKv: 220,
      mv1Kv: 33,
      mv2Kv: 33,
    },
    ratedPowersMva: [100, 125, 150, 200, 250],
    cooling: ["ONAN", "ONAF"],
    vectorGroup: "YNyn0yn0",
    impedancePctRange: [10, 14],
    tapChanger: "OLTC",
    tapRange: "±10 × 1,25%",
    applicableToBESSPOI: true,
    evidence: [
      {
        documentId: "PROJ-BESS-DESIERTO-1129",
        page: 6,
        section: "Resumen ejecutivo",
        confidence: "documented",
        note: "Caso BESS del Desierto reporta 250/125/125 MVA 220/33/33 kV en tabla; el texto de pp.17 menciona valores distintos — ver INC-003 y INC-004",
      },
    ],
    notes:
      "Spec genérica referencial. La inconsistencia 220 vs 230 kV (INC-003) y 250 MVA en tabla vs valores distintos en texto (INC-004) deben resolverse con el cliente.",
  },
];

export function findMainTransformer(
  id: string
): MainTransformerSpec | undefined {
  return mainTransformerCatalog.find((t) => t.id === id);
}
