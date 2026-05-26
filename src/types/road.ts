/**
 * Capa física — caminos y accesos.
 *
 * Un `AccessRoad` reserva espacio para caminos vehiculares internos, accesos
 * de mantenimiento, zonas de izaje y radios de giro.
 */

import type { LocalPoint } from "@/types/geometry";
import type { EvidenceRef } from "@/types/evidence";
import type { SourceReliability } from "@/data/equipmentCatalog";

export type AccessRoadType =
  | "perimeter"
  | "internal"
  | "access"
  | "crane_lay_down"
  | "turning_radius";

export type AccessRoadSurface =
  | "compacted"
  | "concrete"
  | "asphalt"
  | "gravel"
  | "unknown";

export type AccessRoad = {
  id: string;
  type: AccessRoadType;
  /** Línea central del camino en coordenadas locales. */
  centerLine: LocalPoint[];
  /** Ancho útil del camino (sin sobreancho). */
  width_m: number;
  /** Radio mínimo de giro disponible. */
  turningRadius_m?: number;
  surface?: AccessRoadSurface;
  evidence?: EvidenceRef[];
  classification?: SourceReliability;
};
