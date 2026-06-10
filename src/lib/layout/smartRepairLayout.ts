import { CABLE_TO_EQUIPMENT_CLEARANCE_M } from "@/data/defaultConstraints";
import { toLocal, toLngLat } from "@/lib/geometry/projection";
import { generateConceptualPhysicalInfrastructure } from "@/lib/layout/physicalInfrastructure";
import { placedToTechnicalObjects } from "@/rules/bessValidationEngine";
import { allCornersInsidePolygon, pointInPolygon, rectanglesIntersect } from "@/lib/geometry/collision";
import {
  distanceBetweenRectangles,
  distanceRectToPolygonBoundary,
  distancePolylineToPolyline,
  distanceRectToPolyline,
} from "@/lib/geometry/distance";
import type { LngLat, ProjectAnchor, RotatedRectLocal } from "@/types/geometry";
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

interface MeasureInterferenceOptions {
  detailLimit?: number;
  stopAfter?: number;
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
  repairZone?: LngLat[];
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

const DEFAULT_INTERFERENCE_DETAIL_LIMIT = 250;
const MAX_SMART_REPAIR_CANDIDATE_CLUSTERS = 16;
const SMART_REPAIR_SHIFT_STEPS_M = [-1, 1, -2, 2, -3, 3, -5, 5, -8, 8];

function equipmentClusterKey(item: PlacedEquipment): string {
  return item.groupId ?? item.blockId ?? item.id;
}

function emptyInterferenceMetrics(): InterferenceMetrics {
  return {
    cableEquipmentCount: 0,
    cableRoadCount: 0,
    totalInterferences: 0,
    details: {
      cableEquipment: [],
      cableRoad: [],
    },
  };
}

function cableClearanceToObject(route: CableRoute, rect: RotatedRectLocal): number {
  return Math.max(
    0,
    distanceRectToPolyline(rect, route.path) - route.corridorWidth_m / 2
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
  polygon: LngLat[],
  options: MeasureInterferenceOptions = {}
): InterferenceMetrics {
  const emptyMetrics = emptyInterferenceMetrics();

  if (!anchor || placed.length === 0) return emptyMetrics;

  const infra = generateConceptualPhysicalInfrastructure({ placed, anchor, polygon });
  const objects = placedToTechnicalObjects(placed, anchor);
  const detailLimit = options.detailLimit ?? DEFAULT_INTERFERENCE_DETAIL_LIMIT;
  const stopAfter = options.stopAfter;

  const details: InterferenceMetrics["details"] = {
    cableEquipment: [],
    cableRoad: [],
  };
  let cableEquipmentCount = 0;
  let cableRoadCount = 0;

  const metrics = (): InterferenceMetrics => ({
    cableEquipmentCount,
    cableRoadCount,
    totalInterferences: cableEquipmentCount + cableRoadCount,
    details,
  });

  const shouldStop = () =>
    stopAfter !== undefined && cableEquipmentCount + cableRoadCount > stopAfter;

  for (const route of infra.cableRoutes) {
    for (const object of objects) {
      if (object.id === route.fromEntityId || object.id === route.toEntityId) {
        continue;
      }
      const clearance = cableClearanceToObject(route, object.rect);
      if (clearance < CABLE_TO_EQUIPMENT_CLEARANCE_M) {
        cableEquipmentCount += 1;
        if (details.cableEquipment.length < detailLimit) {
          details.cableEquipment.push({
            routeId: route.id,
            equipmentId: object.id,
            clearance,
          });
        }
        if (shouldStop()) return metrics();
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
        cableRoadCount += 1;
        if (details.cableRoad.length < detailLimit) {
          details.cableRoad.push({
            routeId: route.id,
            roadId: road.id,
            clearance,
          });
        }
        if (shouldStop()) return metrics();
      }
    }
  }

  return metrics();
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
    const itemKey = equipmentClusterKey(item);
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

function affectedClusterConflicts(
  placed: PlacedEquipment[],
  anchor: ProjectAnchor,
  polygon: LngLat[],
  rules: {
    bessToBess_m: number;
    bessToPropertyLine_m: number;
    electricalFrontWorkingClearance_m: number;
  },
  clusterKey: string
): {
  collisions: number;
  outside: number;
  spacing: number;
  boundary: number;
} {
  const objects = placedToTechnicalObjects(placed, anchor);
  const keyById = new Map(placed.map((item) => [item.id, equipmentClusterKey(item)]));
  const siteLocalPolygon = polygon.map((vertex) => toLocal(vertex, anchor));
  const hasSitePolygon = siteLocalPolygon.length >= 3;
  const movedObjects = objects.filter((object) => keyById.get(object.id) === clusterKey);
  const otherObjects = objects.filter((object) => keyById.get(object.id) !== clusterKey);
  let collisions = 0;
  let spacing = 0;
  let outside = 0;
  let boundary = 0;

  for (const a of movedObjects) {
    for (const b of otherObjects) {
      const aKind = a.type === "pcs" ? "pcs" : "battery";
      const bKind = b.type === "pcs" ? "pcs" : "battery";
      const required =
        aKind === "pcs" || bKind === "pcs"
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

    if (hasSitePolygon) {
      if (!allCornersInsidePolygon(a.rect, siteLocalPolygon)) {
        outside += 1;
        continue;
      }

      const distToBoundary = distanceRectToPolygonBoundary(a.rect, siteLocalPolygon);
      if (distToBoundary < rules.bessToPropertyLine_m - 0.05) {
        boundary += 1;
      }
    }
  }

  return { collisions, outside, spacing, boundary };
}

function isAffectedSafetyNonWorse(
  before: ReturnType<typeof affectedClusterConflicts>,
  after: ReturnType<typeof affectedClusterConflicts>
): boolean {
  return (
    after.collisions <= before.collisions &&
    after.outside <= before.outside &&
    after.spacing <= before.spacing &&
    after.boundary <= before.boundary
  );
}

// ──────────────────────────────────────────────────────────────────
// Phase F1: Smart Layout Repair Optimization (Greedy Search)
// ──────────────────────────────────────────────────────────────────

export function planSmartLayoutRepair(request: SmartRepairRequest): SmartRepairPlan {
  const { placed, anchor, polygon, lockedIds = [], repairZone = [] } = request;

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

  if (!anchor || placed.length === 0 || baseline.totalInterferences === 0) {
    return emptyPlan;
  }

  const bessToBess_m = request.rules?.bessToBess_m ?? 3;
  const bessToPropertyLine_m = request.rules?.bessToPropertyLine_m ?? 3;
  const electricalFrontWorkingClearance_m = request.rules?.electricalFrontWorkingClearance_m ?? 0.9;
  const rules = { bessToBess_m, bessToPropertyLine_m, electricalFrontWorkingClearance_m };

  const lockedSet = new Set(lockedIds);
  const zoneLocalPolygon =
    repairZone.length >= 3 && anchor
      ? repairZone.map((point) => toLocal(point, anchor))
      : [];
  const zoneApplied = zoneLocalPolygon.length >= 3;

  // Group unique cluster keys
  const clusterItems = new Map<string, PlacedEquipment[]>();
  const clusterByEquipmentId = new Map<string, string>();
  for (const item of placed) {
    const key = equipmentClusterKey(item);
    clusterByEquipmentId.set(item.id, key);
    const items = clusterItems.get(key) ?? [];
    items.push(item);
    clusterItems.set(key, items);
  }
  const clusterKeys = Array.from(clusterItems.keys());
  const interferedClusterKeys = new Set<string>();
  for (const detail of baseline.details.cableEquipment) {
    const key = clusterByEquipmentId.get(detail.equipmentId);
    if (key) interferedClusterKeys.add(key);
  }
  const prioritizedClusterKeys =
    interferedClusterKeys.size > 0
      ? clusterKeys.filter((key) => interferedClusterKeys.has(key))
      : clusterKeys;
  const movableClusterKeys = clusterKeys.filter((key) => {
    const items = clusterItems.get(key) ?? [];
    const inRepairScope =
      !zoneApplied ||
      items.some((item) => pointInPolygon(toLocal(item.anchor, anchor), zoneLocalPolygon));
    return inRepairScope && items.every((item) => !item.locked && !lockedSet.has(item.id));
  });
  const repairCandidateClusterKeys = prioritizedClusterKeys
    .filter((key) => movableClusterKeys.includes(key))
    .slice(0, MAX_SMART_REPAIR_CANDIDATE_CLUSTERS);

  let currentPlaced = [...placed];
  let currentInterferences = { ...baseline };
  let improved = false;
  const movedEquipmentIds = new Set<string>();

  // Run up to 3 passes of greedy nudges.
  // In each pass, we try to find one cluster nudge that yields the greatest reduction in interferences.
  const maxPasses = 3;
  for (let pass = 0; pass < maxPasses; pass++) {
    let bestPassPlaced = currentPlaced;
    let bestPassInterferences = currentInterferences;
    let bestPassShift: { key: string; dx: number; dy: number } | null = null;
    let bestPassDisplacement = Infinity;

    for (const key of repairCandidateClusterKeys) {
      const currentAffectedConflicts = affectedClusterConflicts(
        currentPlaced,
        anchor,
        polygon,
        rules,
        key
      );
      // 1. Try vertical nudges (y axis is most effective to clear horizontal cable corridors)
      for (const dy of SMART_REPAIR_SHIFT_STEPS_M) {
        const candidatePlaced = shiftCluster(currentPlaced, anchor, key, 0, dy);
        const candidateAffectedConflicts = affectedClusterConflicts(
          candidatePlaced,
          anchor,
          polygon,
          rules,
          key
        );
        const isValid = isAffectedSafetyNonWorse(
          currentAffectedConflicts,
          candidateAffectedConflicts
        );

        if (!isValid) continue;

        const candidateInterferences = measureInterferences(candidatePlaced, anchor, polygon, {
          stopAfter: bestPassInterferences.totalInterferences,
        });
        const scoreMetric = candidateInterferences.totalInterferences;
        const bestMetric = bestPassInterferences.totalInterferences;

        if (scoreMetric < bestMetric) {
          bestPassPlaced = candidatePlaced;
          bestPassInterferences = candidateInterferences;
          bestPassShift = { key, dx: 0, dy };
          bestPassDisplacement = Math.abs(dy);
        } else if (scoreMetric === bestMetric && bestPassShift !== null) {
          const disp = Math.abs(dy);
          if (disp < bestPassDisplacement) {
            bestPassPlaced = candidatePlaced;
            bestPassInterferences = candidateInterferences;
            bestPassShift = { key, dx: 0, dy };
            bestPassDisplacement = disp;
          }
        }
      }

      // 2. Try horizontal nudges
      for (const dx of SMART_REPAIR_SHIFT_STEPS_M) {
        const candidatePlaced = shiftCluster(currentPlaced, anchor, key, dx, 0);
        const candidateAffectedConflicts = affectedClusterConflicts(
          candidatePlaced,
          anchor,
          polygon,
          rules,
          key
        );
        const isValid = isAffectedSafetyNonWorse(
          currentAffectedConflicts,
          candidateAffectedConflicts
        );

        if (!isValid) continue;

        const candidateInterferences = measureInterferences(candidatePlaced, anchor, polygon, {
          stopAfter: bestPassInterferences.totalInterferences,
        });
        const scoreMetric = candidateInterferences.totalInterferences;
        const bestMetric = bestPassInterferences.totalInterferences;

        if (scoreMetric < bestMetric) {
          bestPassPlaced = candidatePlaced;
          bestPassInterferences = candidateInterferences;
          bestPassShift = { key, dx, dy: 0 };
          bestPassDisplacement = Math.abs(dx);
        } else if (scoreMetric === bestMetric && bestPassShift !== null) {
          const disp = Math.abs(dx);
          if (disp < bestPassDisplacement) {
            bestPassPlaced = candidatePlaced;
            bestPassInterferences = candidateInterferences;
            bestPassShift = { key, dx, dy: 0 };
            bestPassDisplacement = disp;
          }
        }
      }
    }

    if (bestPassShift !== null && bestPassInterferences.totalInterferences < currentInterferences.totalInterferences) {
      currentPlaced = bestPassPlaced;
      currentInterferences = bestPassInterferences;
      improved = true;

      // Track which equipment IDs were shifted
      const shiftedItems = placed.filter(
        (item) => equipmentClusterKey(item) === bestPassShift!.key
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
