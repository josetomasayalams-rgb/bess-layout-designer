import type { Feature, FeatureCollection, LineString, Polygon } from "geojson";
import type { AccessRoad } from "@/types/road";
import type { LocalPoint, ProjectAnchor } from "@/types/geometry";
import { toLngLat, toLocal } from "@/lib/geometry/projection";

export type AccessRoadFeatureProperties = {
  id: string;
  type: string;
  widthM: number;
  surface: string;
};

function pathIsClosed(path: LocalPoint[]): boolean {
  if (path.length < 2) return false;
  const first = path[0];
  const last = path[path.length - 1];
  return (
    Math.abs(first.x_m - last.x_m) < 1e-6 &&
    Math.abs(first.y_m - last.y_m) < 1e-6
  );
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

function properties(road: AccessRoad): AccessRoadFeatureProperties {
  return {
    id: road.id,
    type: road.type,
    widthM: road.width_m,
    surface: road.surface ?? "unknown",
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

export function createPerimeterAccessRoad(args: {
  polygon: { lng: number; lat: number }[];
  anchor: ProjectAnchor | null;
  widthM?: number;
  surface?: AccessRoad["surface"];
}): AccessRoad | null {
  if (!args.anchor || args.polygon.length < 3) return null;
  const centerLine = args.polygon.map((point) => toLocal(point, args.anchor!));
  centerLine.push(centerLine[0]);
  return {
    id: "road-perimeter-01",
    type: "perimeter",
    centerLine,
    width_m: args.widthM ?? 6,
    turningRadius_m: 10,
    surface: args.surface ?? "gravel",
    evidence: [
      {
        documentId: "__none__",
        confidence: "assumption",
        note: "Conceptual perimeter access road generated for preliminary layout review",
      },
    ],
  };
}

export function accessRoadLineFeatures(
  roads: AccessRoad[],
  anchor: ProjectAnchor | null
): FeatureCollection<LineString, AccessRoadFeatureProperties> {
  if (!anchor) return { type: "FeatureCollection", features: [] };

  const features: Feature<LineString, AccessRoadFeatureProperties>[] = roads
    .filter((road) => road.centerLine.length >= 2)
    .map((road) => ({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: road.centerLine
          .map((point) => toLngLat(point, anchor))
          .map((point) => [point.lng, point.lat] as [number, number]),
      },
      properties: properties(road),
    }));

  return { type: "FeatureCollection", features };
}

export function accessRoadCorridorFeatures(
  roads: AccessRoad[],
  anchor: ProjectAnchor | null
): FeatureCollection<Polygon, AccessRoadFeatureProperties> {
  if (!anchor) return { type: "FeatureCollection", features: [] };

  const features: Feature<Polygon, AccessRoadFeatureProperties>[] = [];
  for (const road of roads) {
    const path = pathIsClosed(road.centerLine)
      ? road.centerLine
      : [...road.centerLine];
    for (let index = 1; index < path.length; index += 1) {
      const polygon = segmentCorridor(
        path[index - 1],
        path[index],
        road.width_m
      );
      if (polygon.length < 3) continue;
      features.push({
        type: "Feature",
        geometry: {
          type: "Polygon",
          coordinates: [localPolygonToLngLatRing(polygon, anchor)],
        },
        properties: properties(road),
      });
    }
  }

  return { type: "FeatureCollection", features };
}
