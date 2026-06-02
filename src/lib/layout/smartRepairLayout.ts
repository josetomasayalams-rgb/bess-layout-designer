import { CABLE_TO_EQUIPMENT_CLEARANCE_M } from "@/data/defaultConstraints";
import { toLocal, toLngLat } from "@/lib/geometry/projection";
import { generateConceptualPhysicalInfrastructure } from "@/lib/layout/physicalInfrastructure";
import { placedToTechnicalObjects } from "@/rules/bessValidationEngine";
import { allCornersInsidePolygon, rectanglesIntersect } from "@/lib/geometry/collision";
import { distanceBetweenRectangles, distanceRectToPolygonBoundary } from "@/lib/geometry/distance";

import type { LngLat, LocalPoint, ProjectAnchor, RotatedRectLocal } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";
import type { CableRoute } from "@/types/cable";
import type { AccessRoad } from "@/types/road";

export interface InterferenceMetrics {
  cableEquipmentCount: number;
  cableRoadCount: number;
  totalInterferences: number;
  details: {
    cableEquipment: Array<{ routeId: string; equipmentId: string; clearance: number }>;
    cableRoad: Array<{ routeId: string; roadId: string; clearance: number }>;
  };
}

export interface SmartRepairRules {
  bessToBess_m?: number;
  bessToPropertyLine_m?: number;
  electricalFrontWorkingClearance_m?: number;
}

export interface SmartRepairRequest {
  placed: PlacedEquipment[];
  anchor: ProjectAnchor | null;
  polygon: LngLat[];
  rules?: SmartRepairRules;
  lockedIds?: string[];
}

export interface SmartRepairPlan {
  baseline: InterferenceMetrics;
  proposed: InterferenceMetrics;
  placed: PlacedEquipment[];
  movedEquipmentIds: string[];
  improved: boolean;
  summary: {
    cableEquipmentBefore: number;
    cableEquipmentAfter: number;
    cableRoadBefore: number;
    cableRoadAfter: number;
    movedCount: number;
    message: string;
  };
}

// ──────────────────────────────────────────────────────────────────
// Geometric helpers duplicated from validation engine for purity
// ──────────────────────────────────────────────────────────────────

function distancePointToSegment(point: LocalPoint, a: LocalPoint, b: LocalPoint): number {
  const dx = b.x_m - a.x_m;
  const dy = b.y_m - a.y_m;
  const lengthSq = dx * dx + dy * dy;
  if (lengthSq <= 1e-12) {
    return Math.hypot(point.x_m - a.x_m, point.y_m - a.y_m);
  }
  const t = Math.max(
    0,
    Math.min(1, ((point.x_m - a.x_m) * dx + (point.y_m - a.y_m) * dy) / lengthSq)
  );
  const projection = { x_m: a.x_m + t * dx, y_m: a.y_m + t * dy };
  return Math.hypot(point.x_m - projection.x_m, point.y_m - projection.y_m);
}

function distancePointToPolyline(point: LocalPoint, path: LocalPoint[]): number {
  if (path.length === 0) return Infinity;
  if (path.length === 1) {
    return Math.hypot(point.x_m - path[0].x_m, point.y_m - path[0].y_m);
  }
  let min = Infinity;
  for (let index = 1; index < path.length; index += 1) {
    min = Math.min(min, distancePointToSegment(point, path[index - 1], path[index]));
  }
  return min;
}

function distancePolylineToPolyline(a: LocalPoint[], b: LocalPoint[]): number {
  let min = Infinity;
  for (const point of a) min = Math.min(min, distancePointToPolyline(point, b));
  for (const point of b) min = Math.min(min, distancePointToPolyline(point, a));
  return min;
}

function rectConservativeRadius(rect: RotatedRectLocal): number {
  return Math.hypot(rect.length_m / 2, rect.width_m / 2);
}

function cableClearanceToObject(route: CableRoute, rect: RotatedRectLocal): number {
  return Math.max(
    0,
    distancePointToPolyline(rect.center, route.path) -
      route.corridorWidth_m / 2 -
      rectConservativeRadius(rect)
  );
}

function cableRoadClearance(route: CableRoute, road: AccessRoad): number {
  return Math.max(
    0,
    distancePolylineToPolyline(route.path, road.centerLine) -
      route.corridorWidth_m / 2 -
      road.width_m / 2
  );
}

// ──────────────────────────────────────────────────────────────────
// Phase F0: Measure interferences
// ──────────────────────────────────────────────────────────────────

export function measureInterferences(
  placed: PlacedEquipment[],
  anchor: ProjectAnchor | null,
  polygon: LngLat[]
): InterferenceMetrics {
  const emptyMetrics: InterferenceMetrics = {
    cableEquipmentCount: 0,
    cableRoadCount: 0,
    totalInterferences: 0,
    details: {
      cableEquipment: [],
      cableRoad: [],
    },
  };

  if (!anchor || placed.length === 0) return emptyMetrics;

  const infra = generateConceptualPhysicalInfrastructure({ placed, anchor, polygon });
  const objects = placedToTechnicalObjects(placed, anchor);

  const details: InterferenceMetrics["details"] = {
    cableEquipment: [],
    cableRoad: [],
  };

  for (const route of infra.cableRoutes) {
    for (const object of objects) {
      if (object.id === route.fromEntityId || object.id === route.toEntityId) {
        continue;
      }
      const clearance = cableClearanceToObject(route, object.rect);
      if (clearance < CABLE_TO_EQUIPMENT_CLEARANCE_M) {
        details.cableEquipment.push({
          routeId: route.id,
          equipmentId: object.id,
          clearance,
        });
      }
    }

    for (const road of infra.accessRoads) {
      if (route.path.length > 0 && road.centerLine.length > 0) {
        const rStart = route.path[0];
        const roadStart = road.centerLine[0];
        if (Math.hypot(rStart.x_m - roadStart.x_m, rStart.y_m - roadStart.y_m) < 0.01) {
          continue;
        }
      }

      const clearance = cableRoadClearance(route, road);
      if (clearance <= 0) {
        details.cableRoad.push({
          routeId: route.id,
          roadId: road.id,
          clearance,
        });
      }
    }
  }

  const cableEquipmentCount = details.cableEquipment.length;
  const cableRoadCount = details.cableRoad.length;

  return {
    cableEquipmentCount,
    cableRoadCount,
    totalInterferences: cableEquipmentCount + cableRoadCount,
    details,
  };
}

// ──────────────────────────────────────────────────────────────────
// Conflict measurement helper to guard safety constraints
// ──────────────────────────────────────────────────────────────────

export function countLayoutConflicts(
  placed: PlacedEquipment[],
  anchor: ProjectAnchor,
  polygon: LngLat[],
  rules: {
    bessToBess_m: number;
    bessToPropertyLine_m: number;
    electricalFrontWorkingClearance_m: number;
  }
): {
  collisions: number;
  outside: number;
  spacing: number;
  boundary: number;
  total: number;
} {
  const objects = placedToTechnicalObjects(placed, anchor);
  const siteLocalPolygon = polygon.map((vertex) => toLocal(vertex, anchor));
  const hasSitePolygon = siteLocalPolygon.length >= 3;

  let collisions = 0;
  let spacing = 0;
  let outside = 0;
  let boundary = 0;

  // Spacing and collisions between equipment
  for (let i = 0; i < objects.length; i++) {
    for (let j = i + 1; j < objects.length; j++) {
      const a = objects[i];
      const b = objects[j];

      // Classify nodes
      const aKind = a.type === "pcs" ? "pcs" : "battery";
      const bKind = b.type === "pcs" ? "pcs" : "battery";
      
      const required = (aKind === "pcs" || bKind === "pcs")
        ? rules.electricalFrontWorkingClearance_m
        : rules.bessToBess_m;

      if (rectanglesIntersect(a.rect, b.rect)) {
        collisions += 1;
        continue;
      }

      const gap = distanceBetweenRectangles(a.rect, b.rect);
      if (gap < required - 0.05) {
        spacing += 1;
      }
    }
  }

  // Site boundaries
  if (hasSitePolygon) {
    for (const object of objects) {
      if (!allCornersInsidePolygon(object.rect, siteLocalPolygon)) {
        outside += 1;
        continue;
      }

      const distToBoundary = distanceRectToPolygonBoundary(object.rect, siteLocalPolygon);
      if (distToBoundary < rules.bessToPropertyLine_m - 0.05) {
        boundary += 1;
      }
    }
  }

  return {
    collisions,
    outside,
    spacing,
    boundary,
    total: collisions + outside + spacing + boundary,
  };
}

// Helper to shift a block/cluster by dx, dy (in meters)
function shiftCluster(
  placed: PlacedEquipment[],
  anchor: ProjectAnchor,
  clusterKey: string,
  dx: number,
  dy: number
): PlacedEquipment[] {
  return placed.map((item) => {
    const itemKey = item.groupId ?? item.blockId ?? item.id;
    if (itemKey !== clusterKey || item.locked) {
      return item;
    }
    const local = toLocal(item.anchor, anchor);
    const shiftedLocal = { x_m: local.x_m + dx, y_m: local.y_m + dy };
    const shiftedLngLat = toLngLat(shiftedLocal, anchor);
    return {
      ...item,
      anchor: shiftedLngLat,
    };
  });
}

// ──────────────────────────────────────────────────────────────────
// Phase F1: Smart Layout Repair Optimization (Greedy Search)
// ──────────────────────────────────────────────────────────────────

export function planSmartLayoutRepair(request: SmartRepairRequest): SmartRepairPlan {
  const { placed, anchor, polygon, lockedIds = [] } = request;

  const baseline = measureInterferences(placed, anchor, polygon);

  const emptyPlan: SmartRepairPlan = {
    baseline,
    proposed: baseline,
    placed,
    movedEquipmentIds: [],
    improved: false,
    summary: {
      cableEquipmentBefore: baseline.cableEquipmentCount,
      cableEquipmentAfter: baseline.cableEquipmentCount,
      cableRoadBefore: baseline.cableRoadCount,
      cableRoadAfter: baseline.cableRoadCount,
      movedCount: 0,
      message: "No smart repair layout adjustments were applied because no improvements could be safely made.",
    },
  };

  if (!anchor || placed.length === 0) {
    return emptyPlan;
  }

  const bessToBess_m = request.rules?.bessToBess_m ?? 3;
  const bessToPropertyLine_m = request.rules?.bessToPropertyLine_m ?? 3;
  const electricalFrontWorkingClearance_m = request.rules?.electricalFrontWorkingClearance_m ?? 0.9;
  const rules = { bessToBess_m, bessToPropertyLine_m, electricalFrontWorkingClearance_m };

  const initialConflicts = countLayoutConflicts(placed, anchor, polygon, rules);
  const lockedSet = new Set(lockedIds);

  // Group unique cluster keys
  const clusterKeys = Array.from(new Set(placed.map((item) => item.groupId ?? item.blockId ?? item.id)));
  const movableClusterKeys = clusterKeys.filter((key) => {
    const items = placed.filter((item) => (item.groupId ?? item.blockId ?? item.id) === key);
    return items.every((item) => !item.locked && !lockedSet.has(item.id));
  });

  let currentPlaced = [...placed];
  let currentInterferences = { ...baseline };
  let currentConflicts = { ...initialConflicts };
  let improved = false;
  const movedEquipmentIds = new Set<string>();

  // Run up to 3 passes of greedy nudges.
  // In each pass, we try to find one cluster nudge that yields the greatest reduction in interferences.
  const maxPasses = 3;
  for (let pass = 0; pass < maxPasses; pass++) {
    let bestPassPlaced = currentPlaced;
    let bestPassInterferences = currentInterferences;
    let bestPassConflicts = currentConflicts;
    let bestPassShift: { key: string; dx: number; dy: number } | null = null;
    let bestPassDisplacement = Infinity;

    for (const key of movableClusterKeys) {
      // 1. Try vertical nudges (y axis is most effective to clear horizontal cable corridors)
      for (const dy of [-1, 1, -2, 2, -3, 3, -4, 4, -5, 5, -6, 6, -7, 7, -8, 8]) {
        const candidatePlaced = shiftCluster(currentPlaced, anchor, key, 0, dy);
        const candidateConflicts = countLayoutConflicts(candidatePlaced, anchor, polygon, rules);

        // Safety Gate: Candidate layout must not introduce any new layout or spacing conflicts
        const isValid =
          candidateConflicts.collisions <= currentConflicts.collisions &&
          candidateConflicts.outside <= currentConflicts.outside &&
          candidateConflicts.spacing <= currentConflicts.spacing &&
          candidateConflicts.boundary <= currentConflicts.boundary;

        if (!isValid) continue;

        const candidateInterferences = measureInterferences(candidatePlaced, anchor, polygon);
        const scoreMetric = candidateInterferences.totalInterferences;
        const bestMetric = bestPassInterferences.totalInterferences;

        if (scoreMetric < bestMetric) {
          bestPassPlaced = candidatePlaced;
          bestPassInterferences = candidateInterferences;
          bestPassConflicts = candidateConflicts;
          bestPassShift = { key, dx: 0, dy };
          bestPassDisplacement = Math.abs(dy);
        } else if (scoreMetric === bestMetric && bestPassShift !== null) {
          const disp = Math.abs(dy);
          if (disp < bestPassDisplacement) {
            bestPassPlaced = candidatePlaced;
            bestPassInterferences = candidateInterferences;
            bestPassConflicts = candidateConflicts;
            bestPassShift = { key, dx: 0, dy };
            bestPassDisplacement = disp;
          }
        }
      }

      // 2. Try horizontal nudges
      for (const dx of [-1, 1, -2, 2, -3, 3, -4, 4, -5, 5, -6, 6, -7, 7, -8, 8]) {
        const candidatePlaced = shiftCluster(currentPlaced, anchor, key, dx, 0);
        const candidateConflicts = countLayoutConflicts(candidatePlaced, anchor, polygon, rules);

        // Safety Gate: Candidate layout must not introduce any new layout or spacing conflicts
        const isValid =
          candidateConflicts.collisions <= currentConflicts.collisions &&
          candidateConflicts.outside <= currentConflicts.outside &&
          candidateConflicts.spacing <= currentConflicts.spacing &&
          candidateConflicts.boundary <= currentConflicts.boundary;

        if (!isValid) continue;

        const candidateInterferences = measureInterferences(candidatePlaced, anchor, polygon);
        const scoreMetric = candidateInterferences.totalInterferences;
        const bestMetric = bestPassInterferences.totalInterferences;

        if (scoreMetric < bestMetric) {
          bestPassPlaced = candidatePlaced;
          bestPassInterferences = candidateInterferences;
          bestPassConflicts = candidateConflicts;
          bestPassShift = { key, dx, dy: 0 };
          bestPassDisplacement = Math.abs(dx);
        } else if (scoreMetric === bestMetric && bestPassShift !== null) {
          const disp = Math.abs(dx);
          if (disp < bestPassDisplacement) {
            bestPassPlaced = candidatePlaced;
            bestPassInterferences = candidateInterferences;
            bestPassConflicts = candidateConflicts;
            bestPassShift = { key, dx, dy: 0 };
            bestPassDisplacement = disp;
          }
        }
      }
    }

    if (bestPassShift !== null && bestPassInterferences.totalInterferences < currentInterferences.totalInterferences) {
      currentPlaced = bestPassPlaced;
      currentInterferences = bestPassInterferences;
      currentConflicts = bestPassConflicts;
      improved = true;

      // Track which equipment IDs were shifted
      const shiftedItems = placed.filter(
        (item) => (item.groupId ?? item.blockId ?? item.id) === bestPassShift!.key
      );
      for (const item of shiftedItems) {
        movedEquipmentIds.add(item.id);
      }
    } else {
      break; // No improvement, terminate optimization
    }
  }

  const proposed = currentInterferences;
  const movedIds = Array.from(movedEquipmentIds);
  const cableEquipmentBefore = baseline.cableEquipmentCount;
  const cableEquipmentAfter = proposed.cableEquipmentCount;
  const cableRoadBefore = baseline.cableRoadCount;
  const cableRoadAfter = proposed.cableRoadCount;

  let message = "";
  if (improved) {
    message = `Smart repair applied: moved ${movedIds.length} equipment items to reduce interferences. ` +
      `Cable-equipment interferences: ${cableEquipmentBefore} → ${cableEquipmentAfter}. ` +
      `Cable-road interferences: ${cableRoadBefore} → ${cableRoadAfter}.`;
  } else {
    message = "No smart repair layout adjustments were applied because no improvements could be safely made.";
  }

  return {
    baseline,
    proposed,
    placed: currentPlaced,
    movedEquipmentIds: movedIds,
    improved,
    summary: {
      cableEquipmentBefore,
      cableEquipmentAfter,
      cableRoadBefore,
      cableRoadAfter,
      movedCount: movedIds.length,
      message,
    },
  };
}
