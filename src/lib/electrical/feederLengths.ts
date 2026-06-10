/**
 * Longitudes de alimentador MT derivadas de las rutas de cable conceptuales.
 *
 * Cierra el loop de ÉPICA 2: asocia las rutas de cable MT generadas por
 * `generateConceptualPhysicalInfrastructure` a cada `MVFeeder` (por las
 * estaciones de conversión que el feeder agrupa) y suma sus longitudes, para
 * que `validateElectricalTopology` (RULE-ELEC-009) pueda sumar las pérdidas
 * I²R del cable colector. Es un estimado conceptual de screening, no un
 * ruteo de ingeniería de detalle.
 */

import type { CableRoute } from "@/types/cable";
import type { MVFeeder } from "@/types/electrical";
import type { LngLat, ProjectAnchor } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";
import { generateConceptualPhysicalInfrastructure } from "@/lib/layout/physicalInfrastructure";

function routeLengthM(route: CableRoute): number {
  if (route.estimatedLength_m && route.estimatedLength_m > 0) return route.estimatedLength_m;
  let total = 0;
  for (let i = 1; i < route.path.length; i += 1) {
    total += Math.hypot(
      route.path[i].x_m - route.path[i - 1].x_m,
      route.path[i].y_m - route.path[i - 1].y_m
    );
  }
  return total;
}

/**
 * Suma, por id de feeder, la longitud de las rutas MT cuyos extremos tocan
 * alguna de las estaciones de conversión del feeder. Una ruta puede contar
 * para más de un feeder solo si toca estaciones de ambos (caso raro); el
 * doble conteo se evita asignando cada ruta al primer feeder que la reclama.
 */
export function computeFeederLengthsM(
  feeders: MVFeeder[],
  routes: CableRoute[]
): Record<string, number> {
  const mtRoutes = routes.filter((r) => r.voltageLevel === "MT");
  const lengths: Record<string, number> = {};
  const claimed = new Set<string>();
  for (const feeder of feeders) {
    const stationSet = new Set(feeder.conversionStationIds);
    let sum = 0;
    for (const route of mtRoutes) {
      if (claimed.has(route.id)) continue;
      if (stationSet.has(route.fromEntityId) || stationSet.has(route.toEntityId)) {
        sum += routeLengthM(route);
        claimed.add(route.id);
      }
    }
    if (sum > 0) lengths[feeder.id] = Math.round(sum * 10) / 10;
  }
  return lengths;
}

/**
 * Conveniencia para callers que tienen el layout pero no las rutas:
 * genera la infraestructura conceptual y devuelve las longitudes por feeder.
 * Devuelve `undefined` si no hay rutas MT (evita pasar un mapa vacío).
 */
export function feederLengthsFromLayout(args: {
  placed: PlacedEquipment[];
  anchor: ProjectAnchor | null;
  polygon: LngLat[];
  hasPoi?: boolean;
  mvFeeders: MVFeeder[];
}): Record<string, number> | undefined {
  if (!args.anchor || args.mvFeeders.length === 0) return undefined;
  const infra = generateConceptualPhysicalInfrastructure({
    placed: args.placed,
    anchor: args.anchor,
    polygon: args.polygon,
    hasPoi: args.hasPoi,
  });
  const lengths = computeFeederLengthsM(args.mvFeeders, infra.cableRoutes);
  return Object.keys(lengths).length > 0 ? lengths : undefined;
}
