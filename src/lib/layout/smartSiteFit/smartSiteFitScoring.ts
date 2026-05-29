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
  // Sort by x coordinate of the center for sweep-and-prune
  const sortedRects = [...rectsWithSpec].sort((a, b) => a.rect.center.x_m - b.rect.center.x_m);

  outerLoop: for (let i = 0; i < sortedRects.length; i++) {
    const rectA = sortedRects[i].rect;
    for (let j = i + 1; j < sortedRects.length; j++) {
      const rectB = sortedRects[j].rect;
      // Since sorted by x, if the difference in x is greater than 9.0m,
      // no subsequent rectB can possibly be close enough to collide.
      if (rectB.center.x_m - rectA.center.x_m > 9.0) {
        break;
      }

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
  // If we have a very large layout, we sample to prevent blocking the thread
  const marginStep = rectsWithSpec.length > 150 ? Math.ceil(rectsWithSpec.length / 150) : 1;
  let marginCheckedCount = 0;
  for (let i = 0; i < rectsWithSpec.length; i += marginStep) {
    const { rect } = rectsWithSpec[i];
    const dist = distanceRectToPolygonBoundary(rect, polygon);
    marginCheckedCount++;
    if (dist === Infinity || isNaN(dist)) {
      totalMarginScore += 0;
    } else if (dist >= 3.0) {
      totalMarginScore += 10;
    } else {
      totalMarginScore += (dist / 3.0) * 10;
    }
  }
  const boundaryMarginScore = Math.max(0, Math.min(10, marginCheckedCount > 0 ? totalMarginScore / marginCheckedCount : 0));

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
  if (sortedRects.length <= 1) {
    totalCorridorScore = 10 * sortedRects.length;
  } else {
    for (let i = 0; i < sortedRects.length; i++) {
      let minDist = Infinity;
      const rectA = sortedRects[i].rect;

      // Look forward (to the right)
      for (let j = i + 1; j < sortedRects.length; j++) {
        const rectB = sortedRects[j].rect;
        if (rectB.center.x_m - rectA.center.x_m > 20.0) {
          break; // Since sorted by x, no further rect can be within 20m in x direction
        }
        const dy = rectA.center.y_m - rectB.center.y_m;
        if (Math.abs(dy) > 20.0) continue;

        const dx = rectA.center.x_m - rectB.center.x_m;
        if (dx * dx + dy * dy > 400) continue;

        const d = distanceBetweenRectangles(rectA, rectB);
        if (d < minDist) {
          minDist = d;
        }
      }

      // Look backward (to the left)
      for (let j = i - 1; j >= 0; j--) {
        const rectB = sortedRects[j].rect;
        if (rectA.center.x_m - rectB.center.x_m > 20.0) {
          break; // Since sorted by x, no prior rect can be within 20m in x direction
        }
        const dy = rectA.center.y_m - rectB.center.y_m;
        if (Math.abs(dy) > 20.0) continue;

        const dx = rectA.center.x_m - rectB.center.x_m;
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
  const corridorEfficiencyScore = Math.max(0, Math.min(10, totalCorridorScore / sortedRects.length));

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

  // --- shapeCompactness (10 pts) ---
  let shapeCompactnessScore = 10;
  if (placed.length > 1) {
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    for (const { rect } of rectsWithSpec) {
      const { center } = rect;
      if (center.x_m < minX) minX = center.x_m;
      if (center.x_m > maxX) maxX = center.x_m;
      if (center.y_m < minY) minY = center.y_m;
      if (center.y_m > maxY) maxY = center.y_m;
    }
    const dx = maxX - minX + 9.34;
    const dy = maxY - minY + 2.438;
    const aspectRatio = Math.max(dx, dy) / Math.max(0.1, Math.min(dx, dy));

    // Penalize extreme aspect ratio (elongated row)
    let aspectPenalty = 0;
    if (aspectRatio > 3.0) {
      aspectPenalty = Math.min(8.0, ((aspectRatio - 3.0) / 5.0) * 8.0);
    }

    // Penalize single row layout when there are many containers
    let rowPenalty = 0;
    const isSingleRow = candidate.shape?.kind === "single_row";
    if (isSingleRow && bessCount >= 8) {
      rowPenalty = 2.0;
    }

    // Proximity to centroid
    let avgX = 0, avgY = 0;
    for (const { rect } of rectsWithSpec) {
      avgX += rect.center.x_m;
      avgY += rect.center.y_m;
    }
    avgX /= rectsWithSpec.length;
    avgY /= rectsWithSpec.length;

    let polyCentroid = { x_m: 0, y_m: 0 };
    if (polygon.length > 0) {
      let sumX = 0, sumY = 0;
      for (const p of polygon) {
        sumX += p.x_m;
        sumY += p.y_m;
      }
      polyCentroid = { x_m: sumX / polygon.length, y_m: sumY / polygon.length };
    }
    const distToCentroid = Math.sqrt((avgX - polyCentroid.x_m) ** 2 + (avgY - polyCentroid.y_m) ** 2);
    let centroidPenalty = 0;
    if (distToCentroid >= 10.0) {
      centroidPenalty = Math.min(2.0, (distToCentroid - 10.0) / 20.0);
    }

    shapeCompactnessScore = Math.max(0, 10 - aspectPenalty - rowPenalty - centroidPenalty);
  }

  const sum =
    insidePolygonScore +
    noCollisionsScore +
    boundaryMarginScore +
    siteUtilizationScore +
    rowRegularityScore +
    corridorEfficiencyScore +
    ratioComplianceScore +
    shapeCompactnessScore;

  // Scale back to 100 max
  const total = (sum / 110) * 100;

  return {
    total: parseFloat(total.toFixed(2)),
    insidePolygon: parseFloat(insidePolygonScore.toFixed(2)),
    noCollisions: parseFloat(noCollisionsScore.toFixed(2)),
    boundaryMargin: parseFloat(boundaryMarginScore.toFixed(2)),
    siteUtilization: parseFloat(siteUtilizationScore.toFixed(2)),
    rowRegularity: parseFloat(rowRegularityScore.toFixed(2)),
    corridorEfficiency: parseFloat(corridorEfficiencyScore.toFixed(2)),
    ratioCompliance: parseFloat(ratioComplianceScore.toFixed(2)),
    shapeCompactness: parseFloat(shapeCompactnessScore.toFixed(2)),
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
