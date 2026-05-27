/**
 * Capa física — corredores de cable.
 *
 * Un `CableRoute` reserva espacio en el layout para una ruta de cable entre
 * dos entidades. La geometría es una línea (lista de puntos locales) más un
 * ancho de corredor que la convierte en una banda para validar colisiones.
 *
 * No reemplaza el cálculo de ampacidad ni el detalle de zanja: es predimensional.
 */

import type { LocalPoint } from "@/types/geometry";
import type { EvidenceRef } from "@/types/evidence";
import type { SourceReliability } from "@/data/equipmentCatalog";

export type CableVoltageLevel = "DC" | "BT" | "MT" | "AT";

export type CableInstallMethod =
  | "buried"
  | "ductbank"
  | "tray"
  | "overhead"
  | "unknown";

export type CableRoute = {
  id: string;
  voltageLevel: CableVoltageLevel;
  /** Tensión nominal en kV (opcional para DC/BT). */
  voltageKv?: number;
  /** Entidad origen (containerId / stationId / busId / poiId). */
  fromEntityId: string;
  /** Entidad destino. */
  toEntityId: string;
  /** Ruta como serie de puntos locales en metros. */
  path: LocalPoint[];
  /** Ancho del corredor parametrizado (incluye margen). */
  corridorWidth_m: number;
  /** Tipo de cable (texto libre, ej. "AL/XLPE/CWS/HDPE 18/33 (36) kV"). */
  cableType?: string;
  conductorMaterial?: "Al" | "Cu";
  sectionMm2?: number;
  circuitsPerPhase?: number;
  /** Longitud estimada (calculable desde `path`). */
  estimatedLength_m?: number;
  installMethod?: CableInstallMethod;
  evidence?: EvidenceRef[];
  classification?: SourceReliability;
  blockId?: string;
  blockIndex?: number;
  templateId?: string;
};
