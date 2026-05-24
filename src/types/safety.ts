/**
 * Capa física — zonas de seguridad contra incendio.
 *
 * Un `FireSafetyZone` representa una restricción espacial originada por un
 * equipo (separación entre containers, fire setback al perímetro, ruta de
 * evacuación, suministro de agua) o por normativa.
 *
 * El polígono se calcula a partir del equipo o de la norma que la origina;
 * `basis` cita la fuente normativa cuando corresponde.
 */

import type { LocalPoint } from "@/types/geometry";
import type { EvidenceRef, EvidencedValue } from "@/types/evidence";

export type FireSafetyZoneType =
  | "container_separation"
  | "boundary_setback"
  | "fire_break"
  | "water_supply"
  | "egress";

export type FireSafetyZone = {
  id: string;
  type: FireSafetyZoneType;
  /** Polígono que ocupa la zona en metros locales. */
  polygon: LocalPoint[];
  /** ID del equipo o entidad que la genera (opcional). */
  triggeredBy?: string;
  /** Separación nominal asociada (cuando aplica). */
  separation_m?: EvidencedValue<number>;
  /** Cita normativa de origen (NFPA 855, RPTD 08, etc.). */
  basis?: EvidenceRef[];
};
