import type { LngLat, LocalPoint, ProjectAnchor } from "@/types/geometry";

const METERS_PER_DEG_LAT = 110540;
const METERS_PER_DEG_LNG_AT_EQUATOR = 111320;

export function toLocal(p: LngLat, anchor: ProjectAnchor): LocalPoint {
  const latRad = (anchor.lat0 * Math.PI) / 180;
  const x_m = (p.lng - anchor.lng0) * Math.cos(latRad) * METERS_PER_DEG_LNG_AT_EQUATOR;
  const y_m = (p.lat - anchor.lat0) * METERS_PER_DEG_LAT;
  return { x_m, y_m };
}

export function toLngLat(p: LocalPoint, anchor: ProjectAnchor): LngLat {
  const latRad = (anchor.lat0 * Math.PI) / 180;
  const lng = anchor.lng0 + p.x_m / (Math.cos(latRad) * METERS_PER_DEG_LNG_AT_EQUATOR);
  const lat = anchor.lat0 + p.y_m / METERS_PER_DEG_LAT;
  return { lng, lat };
}
