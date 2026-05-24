import type { FeatureCollection, Point, Polygon } from "geojson";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import type { CableRoute } from "@/types/cable";
import type { PlacedEquipment } from "@/types/equipment";
import type { LngLat, LocalPoint, ProjectAnchor } from "@/types/geometry";
import type { AccessRoad } from "@/types/road";
import { toLngLat, toLocal } from "@/lib/geometry/projection";
import { createPerimeterAccessRoad } from "@/lib/layout/accessRoads";

export type LayoutZoneType = "mv_yard" | "poi_yard";

export type LayoutZone = {
  id: string;
  type: LayoutZoneType;
  label: string;
  polygon: LocalPoint[];
  center: LocalPoint;
};

export type ConceptualPhysicalInfrastructure = {
  layoutZones: LayoutZone[];
  cableRoutes: CableRoute[];
  accessRoads: AccessRoad[];
  diagnostics: {
    stationCount: number;
    cableRouteCount: number;
    accessRoadCount: number;
    generatedMvYard: boolean;
    generatedPoiYard: boolean;
  };
};

export type LayoutZoneFeatureProperties = {
  id: string;
  type: LayoutZoneType;
  label: string;
};

function localBBox(points: LocalPoint[]) {
  return {
    minX: Math.min(...points.map((point) => point.x_m)),
    maxX: Math.max(...points.map((point) => point.x_m)),
    minY: Math.min(...points.map((point) => point.y_m)),
    maxY: Math.max(...points.map((point) => point.y_m)),
  };
}

function rectZone(args: {
  id: string;
  type: LayoutZoneType;
  label: string;
  center: LocalPoint;
  lengthM: number;
  widthM: number;
}): LayoutZone {
  const halfL = args.lengthM / 2;
  const halfW = args.widthM / 2;
  return {
    id: args.id,
    type: args.type,
    label: args.label,
    center: args.center,
    polygon: [
      { x_m: args.center.x_m - halfL, y_m: args.center.y_m - halfW },
      { x_m: args.center.x_m + halfL, y_m: args.center.y_m - halfW },
      { x_m: args.center.x_m + halfL, y_m: args.center.y_m + halfW },
      { x_m: args.center.x_m - halfL, y_m: args.center.y_m + halfW },
    ],
  };
}

function ring(zone: LayoutZone, anchor: ProjectAnchor): [number, number][] {
  const coords = zone.polygon
    .map((point) => toLngLat(point, anchor))
    .map((point) => [point.lng, point.lat] as [number, number]);
  coords.push(coords[0]);
  return coords;
}

function placedStations(
  placed: PlacedEquipment[],
  anchor: ProjectAnchor
): Array<{ id: string; center: LocalPoint }> {
  return placed
    .map((item) => ({
      item,
      spec: equipmentCatalog.find((entry) => entry.id === item.equipmentSpecId),
    }))
    .filter(({ spec }) => spec?.type === "pcs_mv_station")
    .map(({ item }) => ({
      id: item.id,
      center: toLocal(item.anchor, anchor),
    }));
}

function defaultServiceRoadFromBBox(points: LocalPoint[]): AccessRoad | null {
  if (points.length === 0) return null;
  const bbox = localBBox(points);
  const marginM = 24;
  return {
    id: "road-service-spine-01",
    type: "internal",
    centerLine: [
      { x_m: bbox.minX - marginM, y_m: bbox.maxY + marginM },
      { x_m: bbox.maxX + marginM, y_m: bbox.maxY + marginM },
    ],
    width_m: 6,
    turningRadius_m: 10,
    surface: "gravel",
    evidence: [
      {
        documentId: "__none__",
        confidence: "assumption",
        note: "Conceptual service road generated when no site polygon is available",
      },
    ],
  };
}

export function generateConceptualPhysicalInfrastructure(args: {
  placed: PlacedEquipment[];
  anchor: ProjectAnchor | null;
  polygon: LngLat[];
  cableCorridorWidthM?: number;
  accessRoadWidthM?: number;
}): ConceptualPhysicalInfrastructure {
  if (!args.anchor) {
    return {
      layoutZones: [],
      cableRoutes: [],
      accessRoads: [],
      diagnostics: {
        stationCount: 0,
        cableRouteCount: 0,
        accessRoadCount: 0,
        generatedMvYard: false,
        generatedPoiYard: false,
      },
    };
  }

  const stations = placedStations(args.placed, args.anchor);
  const placedPoints = args.placed.map((item) => toLocal(item.anchor, args.anchor!));
  const layoutZones: LayoutZone[] = [];
  const cableRoutes: CableRoute[] = [];
  const accessRoads: AccessRoad[] = [];

  const perimeterRoad = createPerimeterAccessRoad({
    polygon: args.polygon,
    anchor: args.anchor,
    widthM: args.accessRoadWidthM ?? 6,
  });
  if (perimeterRoad) {
    accessRoads.push(perimeterRoad);
  } else {
    const serviceRoad = defaultServiceRoadFromBBox(placedPoints);
    if (serviceRoad) accessRoads.push(serviceRoad);
  }

  if (stations.length > 0) {
    const bbox = localBBox(placedPoints);
    const centerY = (bbox.minY + bbox.maxY) / 2;
    const mvYardCenter = { x_m: bbox.maxX + 70, y_m: centerY };
    const poiCenter = { x_m: bbox.maxX + 120, y_m: centerY };
    const mvYard = rectZone({
      id: "zone-mv-yard-01",
      type: "mv_yard",
      label: "Sectioning center 33 kV",
      center: mvYardCenter,
      lengthM: 34,
      widthM: Math.max(22, Math.min(90, Math.max(22, bbox.maxY - bbox.minY) * 0.22)),
    });
    const poiYard = rectZone({
      id: "zone-poi-yard-01",
      type: "poi_yard",
      label: "POI 33 kV",
      center: poiCenter,
      lengthM: 26,
      widthM: 20,
    });
    layoutZones.push(mvYard, poiYard);

    for (const [index, station] of stations.entries()) {
      const routePath = [
        station.center,
        { x_m: mvYard.center.x_m, y_m: station.center.y_m },
        mvYard.center,
      ];
      cableRoutes.push({
        id: `route-mt-${String(index + 1).padStart(2, "0")}`,
        voltageLevel: "MT",
        voltageKv: 33,
        fromEntityId: station.id,
        toEntityId: mvYard.id,
        path: routePath,
        corridorWidth_m: args.cableCorridorWidthM ?? 3,
        cableType: "Conceptual 18/33 kV MV collector corridor",
        installMethod: "buried",
        evidence: [
          {
            documentId: "__none__",
            confidence: "assumption",
            note: "Conceptual MV route generated from station position to sectioning center",
          },
        ],
      });
    }

    cableRoutes.push({
      id: "route-mt-poi-01",
      voltageLevel: "MT",
      voltageKv: 33,
      fromEntityId: mvYard.id,
      toEntityId: poiYard.id,
      path: [mvYard.center, poiYard.center],
      corridorWidth_m: args.cableCorridorWidthM ?? 3,
      cableType: "Conceptual 33 kV POI tie corridor",
      installMethod: "buried",
      evidence: [
        {
          documentId: "__none__",
          confidence: "assumption",
          note: "Conceptual tie route from sectioning center to POI",
        },
      ],
    });
  }

  return {
    layoutZones,
    cableRoutes,
    accessRoads,
    diagnostics: {
      stationCount: stations.length,
      cableRouteCount: cableRoutes.length,
      accessRoadCount: accessRoads.length,
      generatedMvYard: layoutZones.some((zone) => zone.type === "mv_yard"),
      generatedPoiYard: layoutZones.some((zone) => zone.type === "poi_yard"),
    },
  };
}

export function layoutZoneFeatures(
  zones: LayoutZone[],
  anchor: ProjectAnchor | null
): FeatureCollection<Polygon, LayoutZoneFeatureProperties> {
  if (!anchor) return { type: "FeatureCollection", features: [] };
  return {
    type: "FeatureCollection",
    features: zones.map((zone) => ({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [ring(zone, anchor)] },
      properties: { id: zone.id, type: zone.type, label: zone.label },
    })),
  };
}

export function layoutZoneLabelFeatures(
  zones: LayoutZone[],
  anchor: ProjectAnchor | null
): FeatureCollection<Point, LayoutZoneFeatureProperties> {
  if (!anchor) return { type: "FeatureCollection", features: [] };
  return {
    type: "FeatureCollection",
    features: zones.map((zone) => {
      const center = toLngLat(zone.center, anchor);
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [center.lng, center.lat] },
        properties: { id: zone.id, type: zone.type, label: zone.label },
      };
    }),
  };
}
