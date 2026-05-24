import { equipmentCatalog, type EquipmentSpec } from "@/data/equipmentCatalog";
import { allCornersInsidePolygon, pointInPolygon, rectanglesIntersect } from "@/lib/geometry/collision";
import {
  distanceBetweenRectangles,
  distanceRectToPolygonBoundary,
} from "@/lib/geometry/distance";
import { rectCorners } from "@/lib/geometry/rectangles";
import { toLngLat, toLocal } from "@/lib/geometry/projection";
import { normalizeRotation } from "@/lib/layout/layoutEditing";
import { generateConceptualPhysicalInfrastructure } from "@/lib/layout/physicalInfrastructure";
import type { LayoutRepairRules } from "@/lib/layout/layoutRepair";
import type { CableRoute } from "@/types/cable";
import type { PlacedEquipment } from "@/types/equipment";
import type { AccessRoad } from "@/types/road";
import type {
  LngLat,
  LocalPoint,
  ProjectAnchor,
  RotatedRectLocal,
} from "@/types/geometry";

export type TerrainFitCandidate = {
  label: string;
  targetAxisDeg: number;
  rotationDeltaDeg: number;
  score: number;
  diagnostics: TerrainFitDiagnostics;
};

export type TerrainFitDiagnostics = {
  equipmentCount: number;
  movableCount: number;
  lockedCount: number;
  batteryContainerCount: number;
  stationCount: number;
  insideCount: number;
  outsideCount: number;
  collisionCount: number;
  spacingViolationCount: number;
  boundaryViolationCount: number;
  blockedAreaViolationCount: number;
  centerOffsetM: number;
  terrainAxisDeg: number;
  layoutAxisDeg: number;
  rotationDeltaDeg: number;
  cableRouteCount: number;
  accessRoadCount: number;
  poiHandled: boolean;
  pccHandled: boolean;
};

export type TerrainFitSummary = {
  movedEquipmentCount: number;
  reorderedContainerCount: number;
  repositionedStationCount: number;
  cableRoutesRecalculated: number;
  accessRoadsRecalculated: number;
  warnings: string[];
};

export type TerrainFitResult = {
  status: "success" | "partial" | "error";
  message: string;
  placed: PlacedEquipment[];
  candidates: TerrainFitCandidate[];
  selected: TerrainFitCandidate | null;
  diagnostics: TerrainFitDiagnostics;
  cableRoutes: CableRoute[];
  accessRoads: AccessRoad[];
  summary: TerrainFitSummary;
};

type EquipmentWithSpec = {
  item: PlacedEquipment;
  spec: EquipmentSpec;
};

type RelativeItem = EquipmentWithSpec & {
  center: LocalPoint;
};

type RelativeGroup = {
  id: string;
  items: RelativeItem[];
  widthM: number;
  heightM: number;
};

type CandidateBuild = {
  label: string;
  targetAxisDeg: number;
  rotationDeltaDeg: number;
  placed: PlacedEquipment[];
};

type AxisAlignedBBox = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

type EvaluatedRect = {
  item: PlacedEquipment;
  spec: EquipmentSpec;
  rect: RotatedRectLocal;
  aabb: AxisAlignedBBox;
};

const MAX_COLUMN_CANDIDATES = 12;

const EMPTY_DIAGNOSTICS: TerrainFitDiagnostics = {
  equipmentCount: 0,
  movableCount: 0,
  lockedCount: 0,
  batteryContainerCount: 0,
  stationCount: 0,
  insideCount: 0,
  outsideCount: 0,
  collisionCount: 0,
  spacingViolationCount: 0,
  boundaryViolationCount: 0,
  blockedAreaViolationCount: 0,
  centerOffsetM: 0,
  terrainAxisDeg: 0,
  layoutAxisDeg: 0,
  rotationDeltaDeg: 0,
  cableRouteCount: 0,
  accessRoadCount: 0,
  poiHandled: false,
  pccHandled: false,
};

const DEFAULT_SUMMARY: TerrainFitSummary = {
  movedEquipmentCount: 0,
  reorderedContainerCount: 0,
  repositionedStationCount: 0,
  cableRoutesRecalculated: 0,
  accessRoadsRecalculated: 0,
  warnings: [],
};

function centroid(points: LocalPoint[]): LocalPoint {
  if (points.length === 0) return { x_m: 0, y_m: 0 };
  const sum = points.reduce(
    (acc, point) => ({ x_m: acc.x_m + point.x_m, y_m: acc.y_m + point.y_m }),
    { x_m: 0, y_m: 0 }
  );
  return { x_m: sum.x_m / points.length, y_m: sum.y_m / points.length };
}

function angleRadToDeg(angleRad: number): number {
  return normalizeRotation((angleRad * 180) / Math.PI);
}

function dominantAxisDeg(points: LocalPoint[]): number {
  if (points.length < 2) return 0;
  const center = centroid(points);
  let sxx = 0;
  let syy = 0;
  let sxy = 0;
  for (const point of points) {
    const x = point.x_m - center.x_m;
    const y = point.y_m - center.y_m;
    sxx += x * x;
    syy += y * y;
    sxy += x * y;
  }
  return angleRadToDeg(0.5 * Math.atan2(2 * sxy, sxx - syy));
}

function shortestDeltaDeg(fromDeg: number, toDeg: number): number {
  const delta = ((toDeg - fromDeg + 540) % 360) - 180;
  return delta === -180 ? 180 : delta;
}

function rotatePoint(point: LocalPoint, rotationDeg: number): LocalPoint {
  const theta = (rotationDeg * Math.PI) / 180;
  return {
    x_m: point.x_m * Math.cos(theta) - point.y_m * Math.sin(theta),
    y_m: point.x_m * Math.sin(theta) + point.y_m * Math.cos(theta),
  };
}

function bbox(points: LocalPoint[]) {
  return {
    minX: Math.min(...points.map((point) => point.x_m)),
    maxX: Math.max(...points.map((point) => point.x_m)),
    minY: Math.min(...points.map((point) => point.y_m)),
    maxY: Math.max(...points.map((point) => point.y_m)),
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function uniqueNumbers(values: number[]): number[] {
  const seen = new Set<number>();
  return values.filter((value) => {
    const normalized = Math.max(1, Math.round(value));
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function candidateColumnCounts(groupCount: number): number[] {
  if (groupCount <= 1) return [1];
  const sqrt = Math.sqrt(groupCount);
  const rough = [
    1,
    2,
    3,
    4,
    5,
    Math.floor(sqrt) - 1,
    Math.floor(sqrt),
    Math.ceil(sqrt),
    Math.ceil(sqrt) + 1,
    Math.ceil(groupCount / 4),
    Math.ceil(groupCount / 3),
    Math.ceil(groupCount / 2),
    groupCount,
  ];
  return uniqueNumbers(rough)
    .map((value) => clamp(value, 1, groupCount))
    .filter((value, index, list) => list.indexOf(value) === index)
    .sort((a, b) => a - b)
    .slice(0, MAX_COLUMN_CANDIDATES);
}

function rectAabb(rect: RotatedRectLocal): AxisAlignedBBox {
  return bbox(rectCorners(rect));
}

function aabbDistance(a: AxisAlignedBBox, b: AxisAlignedBBox): number {
  const dx = Math.max(0, Math.max(a.minX - b.maxX, b.minX - a.maxX));
  const dy = Math.max(0, Math.max(a.minY - b.maxY, b.minY - a.maxY));
  return Math.hypot(dx, dy);
}

function rectOf(item: PlacedEquipment, spec: EquipmentSpec, anchor: ProjectAnchor): RotatedRectLocal {
  return {
    center: toLocal(item.anchor, anchor),
    length_m: spec.footprint.length_m,
    width_m: spec.footprint.width_m,
    rotation_deg: item.rotation_deg,
  };
}

function requiredClearance(a: EquipmentSpec, b: EquipmentSpec, rules: LayoutRepairRules): number {
  if (a.type === "pcs_mv_station" || b.type === "pcs_mv_station") {
    return rules.electricalFrontWorkingClearance_m;
  }
  return rules.bessToBess_m;
}

function uniqueAngles(angles: number[]): number[] {
  const seen = new Set<number>();
  return angles.filter((angle) => {
    const normalized = Math.round(normalizeRotation(angle) * 100) / 100;
    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function groupMovableItems(items: EquipmentWithSpec[]): RelativeGroup[] {
  const groups = new Map<string, EquipmentWithSpec[]>();
  for (const entry of items) {
    const groupId = entry.item.groupId ?? `single:${entry.item.id}`;
    groups.set(groupId, [...(groups.get(groupId) ?? []), entry]);
  }

  return [...groups.entries()].map(([id, groupItems]) => {
    const batteries = groupItems.filter((entry) => entry.spec.type === "battery_container");
    const stations = groupItems.filter((entry) => entry.spec.type === "pcs_mv_station");
    const others = groupItems.filter(
      (entry) =>
        entry.spec.type !== "battery_container" && entry.spec.type !== "pcs_mv_station"
    );
    const batterySpec = batteries[0]?.spec;
    const stationSpec = stations[0]?.spec ?? others[0]?.spec;
    const bessSpacingM = 3;
    const stationGapM = 10;
    const batteryColumns = batteries.length > 0 ? Math.min(4, batteries.length) : 0;
    const batteryRows =
      batteries.length > 0 ? Math.max(1, Math.ceil(batteries.length / batteryColumns)) : 0;
    const matrixLengthM =
      batterySpec && batteryColumns > 0
        ? batteryColumns * batterySpec.footprint.length_m +
          Math.max(0, batteryColumns - 1) * bessSpacingM
        : 0;
    const matrixWidthM =
      batterySpec && batteryRows > 0
        ? batteryRows * batterySpec.footprint.width_m +
          Math.max(0, batteryRows - 1) * bessSpacingM
        : 0;
    const stationStartXM =
      matrixLengthM > 0 && stationSpec
        ? matrixLengthM / 2 + stationGapM + stationSpec.footprint.length_m / 2
        : 0;
    const relative: RelativeItem[] = [];

    batteries.forEach((entry, index) => {
      const row = Math.floor(index / Math.max(1, batteryColumns));
      const col = index % Math.max(1, batteryColumns);
      relative.push({
        ...entry,
        center: {
          x_m: col * (entry.spec.footprint.length_m + bessSpacingM),
          y_m: row * (entry.spec.footprint.width_m + bessSpacingM),
        },
      });
    });

    [...stations, ...others].forEach((entry, index) => {
      relative.push({
        ...entry,
        center: {
          x_m: stationStartXM + index * (entry.spec.footprint.length_m + stationGapM),
          y_m: matrixWidthM / 2 - entry.spec.footprint.width_m / 2,
        },
      });
    });

    if (relative.length === 0) {
      return { id, items: [], widthM: 0, heightM: 0 };
    }

    const corners = relative.flatMap((entry) =>
      rectCorners({
        center: entry.center,
        length_m: entry.spec.footprint.length_m,
        width_m: entry.spec.footprint.width_m,
        rotation_deg: 0,
      })
    );
    const groupBBox = bbox(corners);
    const groupCenter = {
      x_m: (groupBBox.minX + groupBBox.maxX) / 2,
      y_m: (groupBBox.minY + groupBBox.maxY) / 2,
    };

    return {
      id,
      items: relative.map((entry) => ({
        ...entry,
        center: {
          x_m: entry.center.x_m - groupCenter.x_m,
          y_m: entry.center.y_m - groupCenter.y_m,
        },
      })),
      widthM: groupBBox.maxX - groupBBox.minX,
      heightM: groupBBox.maxY - groupBBox.minY,
    };
  });
}

function buildGridCandidate(args: {
  groups: RelativeGroup[];
  locked: EquipmentWithSpec[];
  anchor: ProjectAnchor;
  polygonLocal: LocalPoint[];
  columns: number;
  targetAxisDeg: number;
  layoutAxisDeg: number;
  label: string;
  rules: LayoutRepairRules;
}): CandidateBuild[] {
  const maxGroupWidth = Math.max(...args.groups.map((group) => group.widthM), 1);
  const maxGroupHeight = Math.max(...args.groups.map((group) => group.heightM), 1);
  const blockGapXM = Math.max(12, args.rules.bessToBess_m * 4);
  const blockGapYM = Math.max(12, args.rules.bessToBess_m * 4);
  const columns = Math.max(1, Math.min(args.columns, Math.max(1, args.groups.length)));
  const groupCenters = args.groups.map((group, index) => ({
    group,
    center: {
      x_m: (index % columns) * (maxGroupWidth + blockGapXM),
      y_m: Math.floor(index / columns) * (maxGroupHeight + blockGapYM),
    },
  }));
  const rawPoints = groupCenters.flatMap(({ group, center }) =>
    group.items.map((entry) => ({
      x_m: center.x_m + entry.center.x_m,
      y_m: center.y_m + entry.center.y_m,
    }))
  );
  const rawCenter = centroid(rawPoints);
  const rotationDeltaDeg = shortestDeltaDeg(args.layoutAxisDeg, args.targetAxisDeg);
  const rotatedRelativeItems = groupCenters.flatMap(({ group, center }) =>
    group.items.map((entry) => {
      const local = rotatePoint(
        {
          x_m: center.x_m + entry.center.x_m - rawCenter.x_m,
          y_m: center.y_m + entry.center.y_m - rawCenter.y_m,
        },
        args.targetAxisDeg
      );
      return {
        entry,
        local,
      };
    })
  );
  const rotatedCorners = rotatedRelativeItems.flatMap(({ entry, local }) =>
    rectCorners({
      center: local,
      length_m: entry.spec.footprint.length_m,
      width_m: entry.spec.footprint.width_m,
      rotation_deg: args.targetAxisDeg,
    })
  );
  const candidateBBox = bbox(rotatedCorners);
  const terrainBBox = bbox(args.polygonLocal);
  const widthM = candidateBBox.maxX - candidateBBox.minX;
  const heightM = candidateBBox.maxY - candidateBBox.minY;
  const marginM = Math.max(0, args.rules.bessToPropertyLine_m);
  const centerRangeX = {
    min: terrainBBox.minX + widthM / 2 + marginM,
    max: terrainBBox.maxX - widthM / 2 - marginM,
  };
  const centerRangeY = {
    min: terrainBBox.minY + heightM / 2 + marginM,
    max: terrainBBox.maxY - heightM / 2 - marginM,
  };
  const terrainCenter = centroid(args.polygonLocal);
  const hasValidRange =
    centerRangeX.min <= centerRangeX.max && centerRangeY.min <= centerRangeY.max;
  const clampedCenter = hasValidRange
    ? {
        x_m: clamp(terrainCenter.x_m, centerRangeX.min, centerRangeX.max),
        y_m: clamp(terrainCenter.y_m, centerRangeY.min, centerRangeY.max),
      }
    : terrainCenter;
  const centerSamples = [
    clampedCenter,
    terrainCenter,
    hasValidRange ? { x_m: centerRangeX.min, y_m: clampedCenter.y_m } : clampedCenter,
    hasValidRange ? { x_m: centerRangeX.max, y_m: clampedCenter.y_m } : clampedCenter,
    hasValidRange ? { x_m: clampedCenter.x_m, y_m: centerRangeY.min } : clampedCenter,
    hasValidRange ? { x_m: clampedCenter.x_m, y_m: centerRangeY.max } : clampedCenter,
  ].filter((point, index, list) => {
    if (!pointInPolygon(point, args.polygonLocal)) return index === 0;
    return (
      list.findIndex(
        (other) =>
          Math.abs(other.x_m - point.x_m) < 1e-6 && Math.abs(other.y_m - point.y_m) < 1e-6
      ) === index
    );
  });

  return centerSamples.map((center, index) => ({
    label: `${args.label} · ${columns} col · ${index === 0 ? "center" : "shift"}`,
    targetAxisDeg: normalizeRotation(args.targetAxisDeg),
    rotationDeltaDeg,
    placed: [
      ...args.locked.map((entry) => entry.item),
      ...rotatedRelativeItems.map(({ entry, local }) => ({
        ...entry.item,
        anchor: toLngLat(
          { x_m: center.x_m + local.x_m, y_m: center.y_m + local.y_m },
          args.anchor
        ),
        rotation_deg: normalizeRotation(args.targetAxisDeg),
      })),
    ],
  }));
}

function evaluateCandidate(args: {
  placed: PlacedEquipment[];
  anchor: ProjectAnchor;
  polygonLocal: LocalPoint[];
  terrainCenter: LocalPoint;
  terrainAxisDeg: number;
  layoutAxisDeg: number;
  rotationDeltaDeg: number;
  rules: LayoutRepairRules;
  blockedAreas: LocalPoint[][];
  poiExists: boolean;
}): TerrainFitDiagnostics {
  const entries = args.placed
    .map((item) => {
      const spec = equipmentCatalog.find((entry) => entry.id === item.equipmentSpecId);
      if (!spec) return null;
      const rect = rectOf(item, spec, args.anchor);
      return { item, spec, rect, aabb: rectAabb(rect) };
    })
    .filter(
      (
        entry
      ): entry is EvaluatedRect =>
        entry !== null
    );

  let insideCount = 0;
  let boundaryViolationCount = 0;
  let blockedAreaViolationCount = 0;
  for (const { rect } of entries) {
    const inside = allCornersInsidePolygon(rect, args.polygonLocal);
    if (inside) insideCount += 1;
    if (inside && distanceRectToPolygonBoundary(rect, args.polygonLocal) < args.rules.bessToPropertyLine_m) {
      boundaryViolationCount += 1;
    }
    const corners = rectCorners(rect);
    if (
      args.blockedAreas.some((area) =>
        [rect.center, ...corners].some((point) => pointInPolygon(point, area))
      )
    ) {
      blockedAreaViolationCount += 1;
    }
  }

  let collisionCount = 0;
  let spacingViolationCount = 0;
  const maxClearance = Math.max(
    args.rules.bessToBess_m,
    args.rules.electricalFrontWorkingClearance_m
  );
  for (let i = 0; i < entries.length; i++) {
    for (let j = i + 1; j < entries.length; j++) {
      const a = entries[i];
      const b = entries[j];
      if (aabbDistance(a.aabb, b.aabb) > maxClearance) continue;
      if (rectanglesIntersect(a.rect, b.rect)) {
        collisionCount += 1;
        continue;
      }
      if (
        distanceBetweenRectangles(a.rect, b.rect) <
        requiredClearance(a.spec, b.spec, args.rules)
      ) {
        spacingViolationCount += 1;
      }
    }
  }

  const layoutCenter = centroid(entries.map((entry) => entry.rect.center));
  return {
    equipmentCount: entries.length,
    movableCount: entries.filter((entry) => !entry.item.locked).length,
    lockedCount: entries.filter((entry) => entry.item.locked).length,
    batteryContainerCount: entries.filter((entry) => entry.spec.type === "battery_container").length,
    stationCount: entries.filter((entry) => entry.spec.type === "pcs_mv_station").length,
    insideCount,
    outsideCount: entries.length - insideCount,
    collisionCount,
    spacingViolationCount,
    boundaryViolationCount,
    blockedAreaViolationCount,
    centerOffsetM: Math.hypot(
      layoutCenter.x_m - args.terrainCenter.x_m,
      layoutCenter.y_m - args.terrainCenter.y_m
    ),
    terrainAxisDeg: args.terrainAxisDeg,
    layoutAxisDeg: args.layoutAxisDeg,
    rotationDeltaDeg: args.rotationDeltaDeg,
    cableRouteCount: 0,
    accessRoadCount: 0,
    poiHandled: args.poiExists,
    pccHandled: false,
  };
}

function scoreCandidate(diagnostics: TerrainFitDiagnostics): number {
  const insideRatio =
    diagnostics.equipmentCount > 0
      ? diagnostics.insideCount / diagnostics.equipmentCount
      : 0;
  const targetAxisDeg = normalizeRotation(
    diagnostics.layoutAxisDeg + diagnostics.rotationDeltaDeg
  );
  const longAxisPenalty = Math.abs(
    shortestDeltaDeg(targetAxisDeg, diagnostics.terrainAxisDeg)
  );
  return (
    insideRatio * 20_000 -
    diagnostics.outsideCount * 1_600 -
    diagnostics.collisionCount * 1_200 -
    diagnostics.blockedAreaViolationCount * 1_400 -
    diagnostics.spacingViolationCount * 220 -
    diagnostics.boundaryViolationCount * 260 -
    diagnostics.centerOffsetM * 1.8 -
    longAxisPenalty * 3 -
    Math.abs(diagnostics.rotationDeltaDeg) * 0.4
  );
}

function movedCount(before: PlacedEquipment[], after: PlacedEquipment[], anchor: ProjectAnchor): number {
  const beforeById = new Map(before.map((item) => [item.id, item]));
  return after.filter((item) => {
    const previous = beforeById.get(item.id);
    if (!previous) return true;
    const a = toLocal(previous.anchor, anchor);
    const b = toLocal(item.anchor, anchor);
    return Math.hypot(a.x_m - b.x_m, a.y_m - b.y_m) > 0.1 ||
      Math.abs(previous.rotation_deg - item.rotation_deg) > 0.1;
  }).length;
}

export function repairLayoutToSite(args: {
  placed: PlacedEquipment[];
  anchor: ProjectAnchor | null;
  polygon: LngLat[];
  rules: LayoutRepairRules;
  blockedAreas?: LocalPoint[][];
  poiExists?: boolean;
}): TerrainFitResult {
  const anchor =
    args.anchor ??
    (args.placed[0] ? { lng0: args.placed[0].anchor.lng, lat0: args.placed[0].anchor.lat } : null);

  if (args.placed.length === 0) {
    return {
      status: "error",
      message: "No placed equipment to repair. Generate or place a layout first.",
      placed: args.placed,
      candidates: [],
      selected: null,
      diagnostics: EMPTY_DIAGNOSTICS,
      cableRoutes: [],
      accessRoads: [],
      summary: DEFAULT_SUMMARY,
    };
  }

  if (!anchor || args.polygon.length < 3) {
    return {
      status: "error",
      message: "A site polygon is required before fitting the layout to terrain.",
      placed: args.placed,
      candidates: [],
      selected: null,
      diagnostics: { ...EMPTY_DIAGNOSTICS, equipmentCount: args.placed.length },
      cableRoutes: [],
      accessRoads: [],
      summary: DEFAULT_SUMMARY,
    };
  }

  const entries = args.placed
    .map((item) => {
      const spec = equipmentCatalog.find((entry) => entry.id === item.equipmentSpecId);
      return spec ? { item, spec } : null;
    })
    .filter((entry): entry is EquipmentWithSpec => entry !== null);
  const movable = entries.filter((entry) => !entry.item.locked);
  const locked = entries.filter((entry) => entry.item.locked);

  if (movable.length === 0) {
    return {
      status: "error",
      message: "All equipment is locked. Unlock elements before repairing the layout.",
      placed: args.placed,
      candidates: [],
      selected: null,
      diagnostics: {
        ...EMPTY_DIAGNOSTICS,
        equipmentCount: entries.length,
        lockedCount: locked.length,
      },
      cableRoutes: [],
      accessRoads: [],
      summary: {
        ...DEFAULT_SUMMARY,
        warnings: ["All equipment is locked; no movable layout candidate was generated."],
      },
    };
  }

  const polygonLocal = args.polygon.map((point) => toLocal(point, anchor));
  const terrainCenter = centroid(polygonLocal);
  const terrainAxisDeg = dominantAxisDeg(polygonLocal);
  const layoutRects = entries.map((entry) => rectOf(entry.item, entry.spec, anchor));
  const layoutAxisDeg = dominantAxisDeg(layoutRects.flatMap(rectCorners));
  const groups = groupMovableItems(movable);
  const columns = candidateColumnCounts(groups.length);
  const targetAxes = uniqueAngles([
    terrainAxisDeg,
    terrainAxisDeg + 90,
    layoutAxisDeg,
    layoutAxisDeg + 90,
    0,
    90,
  ]);

  const rawCandidates = targetAxes.flatMap((axis) =>
    columns.flatMap((columnCount) =>
      buildGridCandidate({
        groups,
        locked,
        anchor,
        polygonLocal,
        columns: columnCount,
        targetAxisDeg: axis,
        layoutAxisDeg,
        label:
          Math.abs(shortestDeltaDeg(terrainAxisDeg, axis)) < 1
            ? "terrain long axis"
            : Math.abs(shortestDeltaDeg(terrainAxisDeg + 90, axis)) < 1
              ? "terrain short axis"
              : "layout candidate",
        rules: args.rules,
      })
    )
  );

  const evaluated = rawCandidates
    .map((candidate) => {
      const diagnostics = evaluateCandidate({
        placed: candidate.placed,
        anchor,
        polygonLocal,
        terrainCenter,
        terrainAxisDeg,
        layoutAxisDeg,
        rotationDeltaDeg: candidate.rotationDeltaDeg,
        rules: args.rules,
        blockedAreas: args.blockedAreas ?? [],
        poiExists: args.poiExists ?? false,
      });
      const infrastructure = generateConceptualPhysicalInfrastructure({
        placed: candidate.placed,
        anchor,
        polygon: args.polygon,
      });
      const enrichedDiagnostics = {
        ...diagnostics,
        cableRouteCount: infrastructure.cableRoutes.length,
        accessRoadCount: infrastructure.accessRoads.length,
      };
      return {
        ...candidate,
        diagnostics: enrichedDiagnostics,
        score: scoreCandidate(enrichedDiagnostics),
        cableRoutes: infrastructure.cableRoutes,
        accessRoads: infrastructure.accessRoads,
      };
    })
    .sort((a, b) => b.score - a.score);

  const best = evaluated[0];
  if (!best) {
    return {
      status: "error",
      message: "Could not generate a layout repair candidate.",
      placed: args.placed,
      candidates: [],
      selected: null,
      diagnostics: { ...EMPTY_DIAGNOSTICS, equipmentCount: args.placed.length },
      cableRoutes: [],
      accessRoads: [],
      summary: DEFAULT_SUMMARY,
    };
  }

  const status =
    best.diagnostics.outsideCount === 0 &&
    best.diagnostics.collisionCount === 0 &&
    best.diagnostics.spacingViolationCount === 0 &&
    best.diagnostics.boundaryViolationCount === 0 &&
    best.diagnostics.blockedAreaViolationCount === 0
      ? "success"
      : "partial";

  const warnings: string[] = [];
  if (best.diagnostics.lockedCount > 0 && status !== "success") {
    warnings.push(
      "Locked equipment may be restricting the available area for a complete repair."
    );
  }
  if (!best.diagnostics.poiHandled) {
    warnings.push("No POI entity is modeled in the current project state.");
  }
  warnings.push("PCC is not modeled as a separate entity yet; POI is kept as the current connection boundary.");

  const selected: TerrainFitCandidate = {
    label: best.label,
    targetAxisDeg: best.targetAxisDeg,
    rotationDeltaDeg: best.rotationDeltaDeg,
    score: best.score,
    diagnostics: best.diagnostics,
  };

  return {
    status,
    message:
      status === "success"
        ? "Layout repaired: equipment was regrouped, centered and cable routes were recalculated conceptually."
        : "Layout repair preview ready with remaining issues. Review warnings before applying.",
    placed: best.placed,
    candidates: evaluated.map((candidate) => ({
      label: candidate.label,
      targetAxisDeg: candidate.targetAxisDeg,
      rotationDeltaDeg: candidate.rotationDeltaDeg,
      score: candidate.score,
      diagnostics: candidate.diagnostics,
    })),
    selected,
    diagnostics: best.diagnostics,
    cableRoutes: best.cableRoutes,
    accessRoads: best.accessRoads,
    summary: {
      movedEquipmentCount: movedCount(args.placed, best.placed, anchor),
      reorderedContainerCount: best.diagnostics.batteryContainerCount,
      repositionedStationCount: best.diagnostics.stationCount,
      cableRoutesRecalculated: best.cableRoutes.length,
      accessRoadsRecalculated: best.accessRoads.length,
      warnings,
    },
  };
}
