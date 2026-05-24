import type { Feature, FeatureCollection, LineString, Polygon } from "geojson";
import type { CableRoute } from "@/types/cable";
import type { LocalPoint, ProjectAnchor } from "@/types/geometry";
import { toLngLat } from "@/lib/geometry/projection";

export type CableRouteFeatureProperties = {
  id: string;
  voltageLevel: string;
  voltageKv: number | null;
  cableType: string;
  corridorWidthM: number;
  estimatedLengthM: number;
};

function pathLength(path: LocalPoint[]): number {
  let total = 0;
  for (let index = 1; index < path.length; index += 1) {
    const a = path[index - 1];
    const b = path[index];
    total += Math.hypot(b.x_m - a.x_m, b.y_m - a.y_m);
  }
  return total;
}

function segmentCorridor(a: LocalPoint, b: LocalPoint, widthM: number): LocalPoint[] {
  const dx = b.x_m - a.x_m;
  const dy = b.y_m - a.y_m;
  const length = Math.hypot(dx, dy);
  if (length <= 1e-9) return [];
  const nx = (-dy / length) * (widthM / 2);
  const ny = (dx / length) * (widthM / 2);
  return [
    { x_m: a.x_m + nx, y_m: a.y_m + ny },
    { x_m: b.x_m + nx, y_m: b.y_m + ny },
    { x_m: b.x_m - nx, y_m: b.y_m - ny },
    { x_m: a.x_m - nx, y_m: a.y_m - ny },
  ];
}

function properties(route: CableRoute): CableRouteFeatureProperties {
  return {
    id: route.id,
    voltageLevel: route.voltageLevel,
    voltageKv: route.voltageKv ?? null,
    cableType: route.cableType ?? "",
    corridorWidthM: route.corridorWidth_m,
    estimatedLengthM: route.estimatedLength_m ?? pathLength(route.path),
  };
}

function localPolygonToLngLatRing(
  polygon: LocalPoint[],
  anchor: ProjectAnchor
): [number, number][] {
  const ring = polygon
    .map((point) => toLngLat(point, anchor))
    .map((point) => [point.lng, point.lat] as [number, number]);
  if (ring.length > 0) ring.push(ring[0]);
  return ring;
}

export function cableRouteLineFeatures(
  routes: CableRoute[],
  anchor: ProjectAnchor | null
): FeatureCollection<LineString, CableRouteFeatureProperties> {
  if (!anchor) return { type: "FeatureCollection", features: [] };

  const features: Feature<LineString, CableRouteFeatureProperties>[] = routes
    .filter((route) => route.path.length >= 2)
    .map((route) => ({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: route.path
          .map((point) => toLngLat(point, anchor))
          .map((point) => [point.lng, point.lat] as [number, number]),
      },
      properties: properties(route),
    }));

  return { type: "FeatureCollection", features };
}

export function cableRouteCorridorFeatures(
  routes: CableRoute[],
  anchor: ProjectAnchor | null
): FeatureCollection<Polygon, CableRouteFeatureProperties> {
  if (!anchor) return { type: "FeatureCollection", features: [] };

  const features: Feature<Polygon, CableRouteFeatureProperties>[] = [];
  for (const route of routes) {
    for (let index = 1; index < route.path.length; index += 1) {
      const polygon = segmentCorridor(
        route.path[index - 1],
        route.path[index],
        route.corridorWidth_m
      );
      if (polygon.length < 3) continue;
      features.push({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [localPolygonToLngLatRing(polygon, anchor)],
        },
        properties: properties(route),
      });
    }
  }

  return { type: "FeatureCollection", features };
}
