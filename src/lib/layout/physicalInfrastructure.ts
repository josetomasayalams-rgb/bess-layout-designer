import type { FeatureCollection, Point, Polygon } from "geojson";
import { equipmentCatalog, type SourceReliability } from "@/data/equipmentCatalog";
import { MARGIN_M } from "@/data/defaultConstraints";
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
    blockCount: number;
    warnings?: string[];
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
  const marginM = MARGIN_M;
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
    classification: "preliminary_assumption",
    evidence: [
      {
        documentId: "__none__",
        confidence: "assumption",
        note: "Conceptual service road generated when no site polygon is available",
      },
    ],
  };
}

function closestPointOnPath(point: LocalPoint, path: LocalPoint[]): LocalPoint {
  if (path.length === 0) return point;
  let minDistance = Infinity;
  let closest = path[0];

  for (let i = 0; i < path.length; i++) {
    const p = path[i];
    const dist = Math.hypot(point.x_m - p.x_m, point.y_m - p.y_m);
    if (dist < minDistance) {
      minDistance = dist;
      closest = p;
    }
  }

  for (let i = 1; i < path.length; i++) {
    const a = path[i - 1];
    const b = path[i];
    const dx = b.x_m - a.x_m;
    const dy = b.y_m - a.y_m;
    const segmentLenSq = dx * dx + dy * dy;
    if (segmentLenSq < 1e-9) continue;

    let t = ((point.x_m - a.x_m) * dx + (point.y_m - a.y_m) * dy) / segmentLenSq;
    t = Math.max(0, Math.min(1, t));

    const proj = {
      x_m: a.x_m + t * dx,
      y_m: a.y_m + t * dy,
    };
    const dist = Math.hypot(point.x_m - proj.x_m, point.y_m - proj.y_m);
    if (dist < minDistance) {
      minDistance = dist;
      closest = proj;
    }
  }

  return closest;
}

export function generateConceptualPhysicalInfrastructure(args: {
  placed: PlacedEquipment[];
  anchor: ProjectAnchor | null;
  polygon: LngLat[];
  cableCorridorWidthM?: number;
  accessRoadWidthM?: number;
  hasPoi?: boolean;
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
        blockCount: 0,
        warnings: [],
      },
    };
  }

  const stations = placedStations(args.placed, args.anchor);
  const placedPoints = args.placed.map((item) => toLocal(item.anchor, args.anchor!));
  const layoutZones: LayoutZone[] = [];
  const cableRoutes: CableRoute[] = [];
  const accessRoads: AccessRoad[] = [];

  // Group placed equipment by blockId
  const blockGroups = new Map<string, PlacedEquipment[]>();
  for (const item of args.placed) {
    if (item.blockId) {
      const list = blockGroups.get(item.blockId) ?? [];
      list.push(item);
      blockGroups.set(item.blockId, list);
    }
  }

  // Find loose stations (those without blockId or whose blockId is empty)
  const looseStations = stations.filter((station) => {
    const item = args.placed.find((p) => p.id === station.id);
    return !item?.blockId;
  });

  const blockConnectionPoints: Array<{
    id: string; // stationId if station exists, or blockId
    blockId: string;
    center: LocalPoint;
    blockIndex?: number;
    templateId?: string;
    classification?: SourceReliability;
  }> = [];

  for (const [blockId, items] of blockGroups.entries()) {
    // Look for a station in this block
    const stationItem = items.find((item) => {
      const spec = equipmentCatalog.find((e) => e.id === item.equipmentSpecId);
      return spec?.type === "pcs_mv_station";
    });

    const firstItem = items[0];
    const blockIndex = firstItem?.blockIndex;
    const templateId = firstItem?.templateId;
    const classification = firstItem?.classification ?? "preliminary_assumption";

    if (stationItem) {
      blockConnectionPoints.push({
        id: stationItem.id,
        blockId,
        center: toLocal(stationItem.anchor, args.anchor),
        blockIndex,
        templateId,
        classification,
      });
    } else {
      // Centroid fallback
      let sumX = 0;
      let sumY = 0;
      for (const item of items) {
        const pt = toLocal(item.anchor, args.anchor);
        sumX += pt.x_m;
        sumY += pt.y_m;
      }
      blockConnectionPoints.push({
        id: blockId,
        blockId,
        center: { x_m: sumX / items.length, y_m: sumY / items.length },
        blockIndex,
        templateId,
        classification,
      });
    }
  }

  const connectionPoints: Array<{
    id: string;
    center: LocalPoint;
    blockId?: string;
    blockIndex?: number;
    templateId?: string;
    classification?: SourceReliability;
  }> = [];

  for (const cp of blockConnectionPoints) {
    connectionPoints.push(cp);
  }
  for (const ls of looseStations) {
    connectionPoints.push({
      id: ls.id,
      center: ls.center,
      classification: "pending_validation",
    });
  }

  // Integrated / low-voltage layout: grouped blocks exist but there is no
  // pcs_mv_station anywhere, so the layout collects in low voltage (BT) and can
  // only reach medium voltage through an EXTERNAL step-up transformer that is
  // not modeled here. Sungrow layouts always carry a pcs_mv_station, so this is
  // false for them and their conceptual MV routing is unchanged.
  const isIntegratedLv = stations.length === 0 && connectionPoints.length > 0;

  // Generate main access roads
  const perimeterRoad = createPerimeterAccessRoad({
    polygon: args.polygon,
    anchor: args.anchor,
    widthM: args.accessRoadWidthM ?? 6,
  });
  if (perimeterRoad) {
    perimeterRoad.classification = "preliminary_assumption";
    accessRoads.push(perimeterRoad);
  } else {
    const serviceRoad = defaultServiceRoadFromBBox(placedPoints);
    if (serviceRoad) {
      serviceRoad.classification = "preliminary_assumption";
      accessRoads.push(serviceRoad);
    }
  }

  const mainRoad = perimeterRoad || (accessRoads.length > 0 ? accessRoads[0] : null);

  if (connectionPoints.length > 0) {
    const bbox = localBBox(placedPoints);
    const centerY = (bbox.minY + bbox.maxY) / 2;
    const mvYardCenter = { x_m: bbox.maxX + 70, y_m: centerY };
    const poiCenter = { x_m: bbox.maxX + 120, y_m: centerY };
    const mvYard = rectZone({
      id: "zone-mv-yard-01",
      type: "mv_yard",
      label: isIntegratedLv
        ? "Interfaz MT externa (transformador elevador no modelado)"
        : "Sectioning center 33 kV",
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

    for (const [index, cp] of connectionPoints.entries()) {
      const routePath = [
        cp.center,
        { x_m: mvYard.center.x_m, y_m: cp.center.y_m },
        mvYard.center,
      ];
      let totalLength = 0;
      for (let i = 1; i < routePath.length; i++) {
        totalLength += Math.hypot(routePath[i].x_m - routePath[i - 1].x_m, routePath[i].y_m - routePath[i - 1].y_m);
      }

      cableRoutes.push({
        id: `route-mt-${String(index + 1).padStart(2, "0")}`,
        voltageLevel: isIntegratedLv ? "BT" : "MT",
        voltageKv: isIntegratedLv ? undefined : 33,
        fromEntityId: cp.id,
        toEntityId: mvYard.id,
        path: routePath,
        corridorWidth_m: args.cableCorridorWidthM ?? 3,
        cableType: isIntegratedLv
          ? "Corredor colector BT conceptual (bloque AC integrado)"
          : "Conceptual 18/33 kV MV collector corridor",
        installMethod: "buried",
        estimatedLength_m: Math.round(totalLength * 10) / 10,
        classification: cp.classification ?? "preliminary_assumption",
        blockId: cp.blockId,
        blockIndex: cp.blockIndex,
        templateId: cp.templateId,
        evidence: [
          {
            documentId: "__none__",
            confidence: cp.blockId ? "inferred" : "assumption",
            note: isIntegratedLv
              ? `Corredor colector conceptual en baja tensión (BT) desde el bloque AC integrado ${cp.blockId ?? cp.id} hacia la interfaz MT. La elevación a media tensión requiere un transformador elevador externo NO modelado en esta herramienta.`
              : cp.blockId
                ? `Conceptual MV route from block ${cp.blockId} connection point to sectioning center`
                : "Conceptual MV route generated from loose station position to sectioning center",
          },
        ],
      });
    }

    const poiPath = [mvYard.center, poiYard.center];
    const poiLength = Math.hypot(poiYard.center.x_m - mvYard.center.x_m, poiYard.center.y_m - mvYard.center.y_m);
    cableRoutes.push({
      id: "route-mt-poi-01",
      voltageLevel: "MT",
      voltageKv: 33,
      fromEntityId: mvYard.id,
      toEntityId: poiYard.id,
      path: poiPath,
      corridorWidth_m: args.cableCorridorWidthM ?? 3,
      cableType: "Conceptual 33 kV POI tie corridor",
      installMethod: "buried",
      estimatedLength_m: Math.round(poiLength * 10) / 10,
      classification: "preliminary_assumption",
      evidence: [
        {
          documentId: "__none__",
          confidence: "assumption",
          note: isIntegratedLv
            ? "Corredor conceptual en media tensión (MT) desde la interfaz MT externa (aguas abajo del transformador elevador no modelado) hacia el POI."
            : "Conceptual tie route from sectioning center to POI",
        },
      ],
    });

    // Generate access road branches connecting blocks/stations to the main road
    if (mainRoad) {
      for (const [index, cp] of connectionPoints.entries()) {
        const proj = closestPointOnPath(cp.center, mainRoad.centerLine);
        accessRoads.push({
          id: `road-access-cp-${String(index + 1).padStart(2, "0")}`,
          type: "access",
          centerLine: [cp.center, proj],
          width_m: args.accessRoadWidthM ?? 6,
          turningRadius_m: 10,
          surface: "gravel",
          classification: cp.classification ?? "preliminary_assumption",
          evidence: [
            {
              documentId: "__none__",
              confidence: "assumption",
              note: "Conceptual access road connecting block/station to main circulation",
            },
          ],
        });
      }
    }
  }

  // Warnings generation
  const warnings: string[] = [];
  warnings.push(
    "El trazado de caminos de acceso y corredores de cableado MT es conceptual y sirve únicamente para predimensionamiento preliminar. No reemplaza planos IFC, estudios de canalización ni proyectos definitivos."
  );
  warnings.push(
    "Falta validación detallada de canalizaciones, cruzamientos, radios de curvatura de cables MT y gálibos de caminos."
  );

  const blockCount = blockGroups.size;
  if (blockCount === 0) {
    warnings.push(
      "No se detectaron bloques de equipos agrupados en el layout. Se recomienda utilizar el generador automático en bloques para optimizar el trazado MT."
    );
  }

  if (isIntegratedLv) {
    warnings.push(
      "Bloque AC integrado: la salida de los equipos es en baja tensión (BT). El corredor colector mostrado es conceptual en BT; la conexión a media tensión requiere un transformador elevador externo NO modelado en esta herramienta (requiere validación). El tramo interfaz MT → POI se representa de forma conceptual en MT."
    );
  }

  if (!args.hasPoi) {
    warnings.push(
      "Falta validación del punto de conexión (PCC/POI). El layout conecta hacia un POI/Yard conceptual de referencia."
    );
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
      blockCount,
      warnings,
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
