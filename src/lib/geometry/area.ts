import * as turf from "@turf/turf";
import type { LngLat } from "@/types/geometry";
import type { SiteArea } from "@/types/project";

export function polygonAreaFromLngLat(polygon: LngLat[]): SiteArea | null {
  if (polygon.length < 3) return null;
  const ring = polygon.map((p) => [p.lng, p.lat]);
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) ring.push(first);
  const poly = turf.polygon([ring]);
  const area_m2 = turf.area(poly);
  return {
    area_m2,
    area_ha: area_m2 / 10000,
  };
}
