import type {
  LngLat,
  ProjectAnchor,
  RotatedRectLocal,
} from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";
import { computeSummary } from "@/lib/layout/summaryCalculations";
import { placedToRect } from "@/lib/layout/spacingRules";
import { polygonAreaFromLngLat } from "@/lib/geometry/area";
import { rectCorners } from "@/lib/geometry/rectangles";
import { toLocal } from "@/lib/geometry/projection";
import {
  allCornersInsidePolygon,
  rectanglesIntersect,
} from "@/lib/geometry/collision";

/** Comparable metrics for one captured layout alternative. */
export type AlternativeMetrics = {
  equipmentCount: number;
  batteryCount: number;
  pcsCount: number;
  energyMwh: number;
  powerMva: number;
  /** Sum of every equipment footprint (rotation-independent). */
  footprintAreaM2: number;
  /** Axis-aligned bounding box of the whole layout — changes with orientation. */
  boundingAreaM2: number;
  collisionCount: number;
  outOfBoundsCount: number;
  /** True when there are no collisions and nothing falls outside the site. */
  compliant: boolean;
};

/** Axis-aligned bounding box area (m²) of a set of rotated rectangles. */
function boundingAreaOfRects(rects: RotatedRectLocal[]): number {
  if (rects.length === 0) return 0;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const rect of rects) {
    for (const corner of rectCorners(rect)) {
      minX = Math.min(minX, corner.x_m);
      minY = Math.min(minY, corner.y_m);
      maxX = Math.max(maxX, corner.x_m);
      maxY = Math.max(maxY, corner.y_m);
    }
  }
  if (!Number.isFinite(minX)) return 0;
  return (maxX - minX) * (maxY - minY);
}

/**
 * Computes the comparison metrics for a captured layout alternative.
 *
 * Reuses the existing summary, collision and polygon primitives so the
 * comparator stays consistent with the rest of the app.
 */
export function computeAlternativeMetrics(
  placed: PlacedEquipment[],
  polygon: LngLat[],
  anchor: ProjectAnchor | null
): AlternativeMetrics {
  const siteArea = polygonAreaFromLngLat(polygon);
  const summary = computeSummary(placed, siteArea);

  let collisionCount = 0;
  let outOfBoundsCount = 0;
  let boundingAreaM2 = 0;

  if (anchor) {
    const rects = placed
      .map((p) => placedToRect(p, anchor))
      .filter((rect): rect is RotatedRectLocal => rect !== null);

    for (let i = 0; i < rects.length; i++) {
      for (let j = i + 1; j < rects.length; j++) {
        if (rectanglesIntersect(rects[i], rects[j])) collisionCount += 1;
      }
    }

    if (polygon.length >= 3) {
      const localPolygon = polygon.map((vertex) => toLocal(vertex, anchor));
      for (const rect of rects) {
        if (!allCornersInsidePolygon(rect, localPolygon)) {
          outOfBoundsCount += 1;
        }
      }
    }

    boundingAreaM2 = boundingAreaOfRects(rects);
  }

  return {
    equipmentCount: placed.length,
    batteryCount: summary.battery_container_count,
    pcsCount: summary.pcs_count,
    energyMwh: summary.total_energy_mwh_dc_bol,
    powerMva: summary.total_apparent_power_mva,
    footprintAreaM2: summary.occupied_area_m2,
    boundingAreaM2,
    collisionCount,
    outOfBoundsCount,
    compliant: collisionCount === 0 && outOfBoundsCount === 0,
  };
}

export type ComparisonRecommendation = {
  slot: "A" | "B" | null;
  reason: "compliant" | "fewer-issues" | "more-compact" | "equivalent";
};

/**
 * Suggests which alternative is technically preferable:
 * 1. The one that is compliant when the other is not.
 * 2. Otherwise the one with fewer conflicts.
 * 3. On a tie, the more compact layout (smaller bounding box).
 */
export function recommendAlternative(
  a: AlternativeMetrics,
  b: AlternativeMetrics
): ComparisonRecommendation {
  if (a.compliant !== b.compliant) {
    return { slot: a.compliant ? "A" : "B", reason: "compliant" };
  }

  const aIssues = a.collisionCount + a.outOfBoundsCount;
  const bIssues = b.collisionCount + b.outOfBoundsCount;
  if (aIssues !== bIssues) {
    return { slot: aIssues < bIssues ? "A" : "B", reason: "fewer-issues" };
  }

  if (a.boundingAreaM2 !== b.boundingAreaM2 && a.boundingAreaM2 > 0 && b.boundingAreaM2 > 0) {
    return {
      slot: a.boundingAreaM2 < b.boundingAreaM2 ? "A" : "B",
      reason: "more-compact",
    };
  }

  return { slot: null, reason: "equivalent" };
}
