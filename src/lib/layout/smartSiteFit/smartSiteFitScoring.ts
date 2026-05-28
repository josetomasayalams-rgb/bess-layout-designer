import type { LocalPoint, ProjectAnchor, RotatedRectLocal } from "@/types/geometry";
import type { SmartSiteFitCandidate, SmartSiteFitScore } from "./smartSiteFitTypes";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import { pointInPolygon, rectanglesIntersect } from "@/lib/geometry/collision";
import { rectCorners } from "@/lib/geometry/rectangles";
import { toLocal } from "@/lib/geometry/projection";
import { distanceBetweenRectangles, distanceRectToPolygonBoundary } from "@/lib/geometry/distance";
import { getContainersPerPcsForDuration } from "./smartSiteFitPresets";

export function scoreCandidate(
  candidate: SmartSiteFitCandidate,
  polygon: LocalPoint[],
  anchor: ProjectAnchor,
  durationHours: number
): SmartSiteFitScore {
  const placed = candidate.placedEquipment;
  if (placed.length === 0) {
    return {
      total: 0,
      insidePolygon: 0,
      noCollisions: 0,
      boundaryMargin: 0,
      siteUtilization: 0,
      rowRegularity: 0,
      corridorEfficiency: 0,
      ratioCompliance: 0,
    };
  }

  // 1. Resolve rects in local coordinates
  const rectsWithSpec = placed.map((item) => {
    const localCenter = toLocal(item.anchor, anchor);
    const spec = equipmentCatalog.find((s) => s.id === item.equipmentSpecId);
    const length_m = spec?.footprint.length_m ?? 5;
    const width_m = spec?.footprint.width_m ?? 2;
    return {
      item,
      spec,
      rect: {
        center: localCenter,
        length_m,
        width_m,
        rotation_deg: item.rotation_deg,
      } as RotatedRectLocal,
    };
  });

  // --- insidePolygon (25 pts) ---
  let totalCorners = 0;
  let cornersInside = 0;
  for (const { rect } of rectsWithSpec) {
    const corners = rectCorners(rect);
    totalCorners += 4;
    for (const c of corners) {
      if (pointInPolygon(c, polygon)) {
        cornersInside++;
      }
    }
  }
  const insidePolygonScore = totalCorners > 0 ? (cornersInside / totalCorners) * 25 : 0;

  // --- noCollisions (25 pts) ---
  let collisionCount = 0;
  const maxAllowedCollisions = rectsWithSpec.length;
  outerLoop: for (let i = 0; i < rectsWithSpec.length; i++) {
    const rectA = rectsWithSpec[i].rect;
    for (let j = i + 1; j < rectsWithSpec.length; j++) {
      const rectB = rectsWithSpec[j].rect;
      // Fast center distance filter (8.5m is upper bound for intersection of any two specs)
      const dx = rectA.center.x_m - rectB.center.x_m;
      const dy = rectA.center.y_m - rectB.center.y_m;
      if (dx * dx + dy * dy > 75) continue;

      if (rectanglesIntersect(rectA, rectB)) {
        collisionCount++;
        if (collisionCount >= maxAllowedCollisions) {
          break outerLoop;
        }
      }
    }
  }
  // Penalize linearly relative to count
  const noCollisionsScore = Math.max(0, 25 - (collisionCount / rectsWithSpec.length) * 25);

  // --- boundaryMargin (10 pts) ---
  // Ideal boundary margin is >= 3.0 meters
  let totalMarginScore = 0;
  for (const { rect } of rectsWithSpec) {
    const dist = distanceRectToPolygonBoundary(rect, polygon);
    if (dist === Infinity || isNaN(dist)) {
      totalMarginScore += 0;
    } else if (dist >= 3.0) {
      totalMarginScore += 10;
    } else {
      totalMarginScore += (dist / 3.0) * 10;
    }
  }
  const boundaryMarginScore = Math.max(0, Math.min(10, totalMarginScore / rectsWithSpec.length));

  // --- siteUtilization (10 pts) ---
  // Calculate total footprint area vs polygon area
  let occupiedArea = 0;
  for (const { rect } of rectsWithSpec) {
    occupiedArea += rect.length_m * rect.width_m;
  }
  let polyArea = 0;
  // Calculate polygon area
  if (polygon.length >= 3) {
    let areaSum = 0;
    for (let i = 0; i < polygon.length; i++) {
      const p1 = polygon[i];
      const p2 = polygon[(i + 1) % polygon.length];
      areaSum += p1.x_m * p2.y_m - p2.x_m * p1.y_m;
    }
    polyArea = Math.abs(areaSum) / 2;
  }
  const ratio = polyArea > 0 ? occupiedArea / polyArea : 0;
  // Ideal ratio is between 10% and 45%
  let siteUtilizationScore = 0;
  if (ratio >= 0.1 && ratio <= 0.45) {
    siteUtilizationScore = 10;
  } else if (ratio < 0.1) {
    siteUtilizationScore = (ratio / 0.1) * 10;
  } else {
    siteUtilizationScore = Math.max(0, 10 - ((ratio - 0.45) / 0.35) * 10);
  }

  // --- rowRegularity (10 pts) ---
  // Award points for uniform rotations and grid-like layout tags
  const uniqueRotations = new Set<number>();
  let groupedCount = 0;
  for (const { item } of rectsWithSpec) {
    uniqueRotations.add(Math.round(item.rotation_deg));
    if (item.groupId || item.blockId) {
      groupedCount++;
    }
  }
  const uniformRotationPts = uniqueRotations.size === 1 ? 5 : uniqueRotations.size <= 2 ? 3 : 0;
  const groupingPts = groupedCount === placed.length ? 5 : groupedCount > 0 ? 3 : 0;
  const rowRegularityScore = uniformRotationPts + groupingPts;

  // --- corridorEfficiency (10 pts) ---
  // Separation between BESS containers should be ~3.0 meters
  let totalCorridorScore = 0;
  if (rectsWithSpec.length <= 1) {
    totalCorridorScore = 10 * rectsWithSpec.length;
  } else {
    for (let i = 0; i < rectsWithSpec.length; i++) {
      let minDist = Infinity;
      const rectA = rectsWithSpec[i].rect;
      for (let j = 0; j < rectsWithSpec.length; j++) {
        if (i === j) continue;
        const rectB = rectsWithSpec[j].rect;

        // Fast center distance filter: skip if centers are > 20m apart (closest under 15m is what matters)
        const dx = rectA.center.x_m - rectB.center.x_m;
        const dy = rectA.center.y_m - rectB.center.y_m;
        if (dx * dx + dy * dy > 400) continue;

        const d = distanceBetweenRectangles(rectA, rectB);
        if (d < minDist) {
          minDist = d;
        }
      }
      if (minDist === Infinity) {
        // Spacing too wide, inefficient
        totalCorridorScore += 0;
      } else if (minDist >= 2.5 && minDist <= 5.0) {
        totalCorridorScore += 10;
      } else if (minDist < 2.5) {
        // Violating spacing
        totalCorridorScore += (minDist / 2.5) * 5;
      } else {
        // Spacing too wide, inefficient
        totalCorridorScore += Math.max(0, 10 - ((minDist - 5.0) / 10.0) * 10);
      }
    }
  }
  const corridorEfficiencyScore = Math.max(0, Math.min(10, totalCorridorScore / rectsWithSpec.length));

  // --- ratioCompliance (10 pts) ---
  let bessCount = 0;
  let pcsCount = 0;
  for (const { spec } of rectsWithSpec) {
    if (spec?.type === "battery_container") {
      bessCount++;
    } else if (spec?.type === "pcs_mv_station") {
      pcsCount++;
    }
  }
  const targetRatio = getContainersPerPcsForDuration(durationHours);
  let ratioComplianceScore = 0;
  if (pcsCount > 0) {
    const actualRatio = bessCount / pcsCount;
    if (Math.abs(actualRatio - targetRatio) < 0.1) {
      ratioComplianceScore = 10;
    } else {
      ratioComplianceScore = Math.max(0, 10 - Math.abs(actualRatio - targetRatio) * 2);
    }
  } else if (bessCount === 0 && pcsCount === 0) {
    ratioComplianceScore = 10;
  }

  const total =
    insidePolygonScore +
    noCollisionsScore +
    boundaryMarginScore +
    siteUtilizationScore +
    rowRegularityScore +
    corridorEfficiencyScore +
    ratioComplianceScore;

  return {
    total: parseFloat(total.toFixed(2)),
    insidePolygon: parseFloat(insidePolygonScore.toFixed(2)),
    noCollisions: parseFloat(noCollisionsScore.toFixed(2)),
    boundaryMargin: parseFloat(boundaryMarginScore.toFixed(2)),
    siteUtilization: parseFloat(siteUtilizationScore.toFixed(2)),
    rowRegularity: parseFloat(rowRegularityScore.toFixed(2)),
    corridorEfficiency: parseFloat(corridorEfficiencyScore.toFixed(2)),
    ratioCompliance: parseFloat(ratioComplianceScore.toFixed(2)),
  };
}

export function rankSmartSiteFitCandidates(
  candidates: SmartSiteFitCandidate[],
  polygon: LocalPoint[],
  anchor: ProjectAnchor,
  durationHours: number
): SmartSiteFitCandidate[] {
  return candidates
    .map((c) => {
      const score = scoreCandidate(c, polygon, anchor, durationHours);
      return { ...c, score };
    })
    .sort((a, b) => b.score.total - a.score.total);
}

export function selectTopSmartSiteFitAlternatives(
  candidates: SmartSiteFitCandidate[],
  limit: number = 3
): SmartSiteFitCandidate[] {
  return candidates.slice(0, limit);
}
