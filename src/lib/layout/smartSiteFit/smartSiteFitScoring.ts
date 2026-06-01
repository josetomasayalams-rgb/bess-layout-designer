import type { LocalPoint, ProjectAnchor, RotatedRectLocal } from "@/types/geometry";
import type { SmartSiteFitCandidate, SmartSiteFitScore } from "./smartSiteFitTypes";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import { pointInPolygon, rectanglesIntersect } from "@/lib/geometry/collision";
import { rectCorners } from "@/lib/geometry/rectangles";
import { toLocal } from "@/lib/geometry/projection";
import { distanceBetweenRectangles, distanceRectToPolygonBoundary } from "@/lib/geometry/distance";
import { getContainersPerPcsForDuration } from "./smartSiteFitPresets";

// O(1) spec lookup. Scoring giant layouts resolves the spec for every placed
// item, so a linear `equipmentCatalog.find` per item is quadratic at scale.
const specById = new Map(equipmentCatalog.map((s) => [s.id, s]));

export function scoreCandidate(
  candidate: SmartSiteFitCandidate,
  polygon: LocalPoint[],
  anchor: ProjectAnchor,
  durationHours: number,
  targetRatio?: number
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
    const spec = specById.get(item.equipmentSpecId);
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
  // The active preset's BESS/PCS ratio (preset-driven); falls back to the shared
  // duration heuristic when no ratio is threaded in (e.g. direct test callers).
  const effectiveTargetRatio = targetRatio ?? getContainersPerPcsForDuration(durationHours);
  let ratioComplianceScore = 0;
  if (pcsCount > 0) {
    const actualRatio = bessCount / pcsCount;
    if (Math.abs(actualRatio - effectiveTargetRatio) < 0.1) {
      ratioComplianceScore = 10;
    } else {
      ratioComplianceScore = Math.max(0, 10 - Math.abs(actualRatio - effectiveTargetRatio) * 2);
    }
  } else if (pcsCount === 0) {
    // No separate PCS: either an empty layout or an integrated architecture
    // (e.g. Tesla Megapack), where each unit carries its own inverter and there
    // is no BESS/PCS ratio to satisfy. Treat ratio compliance as neutral/full.
    ratioComplianceScore = 10;
  }

  // --- Shared layout geometry (used by shapeCompactness, terrainFit, layoutAesthetics) ---
  let layoutMinX = Infinity, layoutMaxX = -Infinity;
  let layoutMinY = Infinity, layoutMaxY = -Infinity;
  let avgX = 0, avgY = 0;
  for (const { rect } of rectsWithSpec) {
    const { center } = rect;
    if (center.x_m < layoutMinX) layoutMinX = center.x_m;
    if (center.x_m > layoutMaxX) layoutMaxX = center.x_m;
    if (center.y_m < layoutMinY) layoutMinY = center.y_m;
    if (center.y_m > layoutMaxY) layoutMaxY = center.y_m;
    avgX += center.x_m;
    avgY += center.y_m;
  }
  avgX /= rectsWithSpec.length;
  avgY /= rectsWithSpec.length;

  const layoutW = layoutMaxX - layoutMinX + 9.34;
  const layoutH = layoutMaxY - layoutMinY + 2.438;
  const aspectRatio = Math.max(layoutW, layoutH) / Math.max(0.1, Math.min(layoutW, layoutH));
  const layoutAspect = layoutW / Math.max(0.1, layoutH); // >1 wide, <1 deep

  // Polygon centroid + bounding box
  let polyMinX = Infinity, polyMaxX = -Infinity;
  let polyMinY = Infinity, polyMaxY = -Infinity;
  let polyCentroid = { x_m: 0, y_m: 0 };
  if (polygon.length > 0) {
    let sumX = 0, sumY = 0;
    for (const p of polygon) {
      sumX += p.x_m;
      sumY += p.y_m;
      if (p.x_m < polyMinX) polyMinX = p.x_m;
      if (p.x_m > polyMaxX) polyMaxX = p.x_m;
      if (p.y_m < polyMinY) polyMinY = p.y_m;
      if (p.y_m > polyMaxY) polyMaxY = p.y_m;
    }
    polyCentroid = { x_m: sumX / polygon.length, y_m: sumY / polygon.length };
  }
  const terrainW = Math.max(0.1, polyMaxX - polyMinX);
  const terrainH = Math.max(0.1, polyMaxY - polyMinY);
  const terrainAspect = terrainW / terrainH; // >1 wide, <1 deep
  const distToCentroid = Math.sqrt((avgX - polyCentroid.x_m) ** 2 + (avgY - polyCentroid.y_m) ** 2);

  // --- shapeCompactness (10 pts) ---
  let shapeCompactnessScore = 10;
  if (placed.length > 1) {
    let aspectPenalty = 0;
    if (aspectRatio > 3.0) {
      aspectPenalty = Math.min(8.0, ((aspectRatio - 3.0) / 5.0) * 8.0);
    }

    let rowPenalty = 0;
    const isSingleRow = candidate.shape?.kind === "single_row";
    if (isSingleRow && bessCount >= 8) {
      rowPenalty = 2.0;
    }

    let centroidPenalty = 0;
    if (distToCentroid >= 10.0) {
      centroidPenalty = Math.min(2.0, (distToCentroid - 10.0) / 20.0);
    }

    shapeCompactnessScore = Math.max(0, 10 - aspectPenalty - rowPenalty - centroidPenalty);
  }

  // --- terrainFit (10 pts): how well the layout orientation matches the terrain ---
  // Premia coincidencia forma vs. relación ancho/largo del terreno.
  const classify = (a: number): "wide" | "deep" | "square" =>
    a > 1.3 ? "wide" : a < 0.77 ? "deep" : "square";
  let terrainFitScore = 10;
  if (placed.length > 1) {
    const terrainClass = classify(terrainAspect);
    const layoutClass = classify(layoutAspect);
    if (terrainClass === layoutClass) {
      terrainFitScore = 10;
    } else if (terrainClass === "square" || layoutClass === "square") {
      terrainFitScore = 6;
    } else {
      // wide layout on deep terrain (or vice-versa): worst alignment
      terrainFitScore = 2;
    }
    // Shape-kind contradiction penalty
    const kind = candidate.shape?.kind;
    if (
      (terrainClass === "wide" && kind === "deep_grid") ||
      (terrainClass === "deep" && kind === "wide_grid")
    ) {
      terrainFitScore = Math.max(0, terrainFitScore - 2);
    }
    // Reward kinds that suit a square terrain
    if (
      terrainClass === "square" &&
      (kind === "compact_grid" ||
        kind === "two_row_block" ||
        kind === "multi_block" ||
        kind === "perimeter_ring")
    ) {
      terrainFitScore = Math.min(10, terrainFitScore + 2);
    }
    // The fishbone spine suits elongated sites with a central service road.
    if (terrainClass === "wide" && kind === "spine_ribs") {
      terrainFitScore = Math.min(10, terrainFitScore + 2);
    }
  }

  // --- pcsIntegration (10 pts): PCS/MV proximity to its BESS cluster ---
  // Penaliza PCS aislados o alineados como muralla externa.
  let pcsIntegrationScore = 10;
  const pcsRects = rectsWithSpec.filter((r) => r.spec?.type === "pcs_mv_station");
  const bessRects = rectsWithSpec.filter((r) => r.spec?.type === "battery_container");
  if (pcsRects.length > 0 && bessRects.length > 0) {
    // Group BESS by block so each PCS only measures distance to its own cluster
    // (O(pcs * bessPerBlock) instead of O(pcs * bess)).
    const bessByBlock = new Map<string, typeof bessRects>();
    for (const bess of bessRects) {
      const key = bess.item.blockId ?? "__none__";
      const list = bessByBlock.get(key);
      if (list) list.push(bess);
      else bessByBlock.set(key, [bess]);
    }
    let totalNearest = 0;
    for (const pcs of pcsRects) {
      const sameBlock =
        pcs.item.blockId != null ? bessByBlock.get(pcs.item.blockId) : undefined;
      const candidatesForPcs = sameBlock && sameBlock.length > 0 ? sameBlock : bessRects;
      let nearest = Infinity;
      for (const bess of candidatesForPcs) {
        const dx = pcs.rect.center.x_m - bess.rect.center.x_m;
        const dy = pcs.rect.center.y_m - bess.rect.center.y_m;
        const d = dx * dx + dy * dy;
        if (d < nearest) nearest = d;
      }
      totalNearest += Math.sqrt(nearest);
    }
    const avgNearest = totalNearest / pcsRects.length;
    // Healthy cluster: PCS adjacent to its BESS (<= ~8m). Detached wall: large distance.
    if (avgNearest <= 8) {
      pcsIntegrationScore = 10;
    } else if (avgNearest <= 20) {
      pcsIntegrationScore = Math.max(4, 10 - ((avgNearest - 8) / 12) * 6);
    } else {
      pcsIntegrationScore = Math.max(0, 4 - ((avgNearest - 20) / 20) * 4);
    }
  }

  // --- capacityIntent (10 pts): occupation aligned with the strategy ---
  let capacityIntentScore = 10;
  const occ = ratio; // occupied footprint / polygon area
  if (placed.length > 1) {
    if (candidate.strategy === "max_capacity") {
      capacityIntentScore = occ >= 0.3 ? 10 : Math.max(0, (occ / 0.3) * 10);
    } else if (candidate.strategy === "conservative") {
      if (occ <= 0.2) {
        capacityIntentScore = occ >= 0.08 ? 10 : (occ / 0.08) * 10;
      } else {
        capacityIntentScore = Math.max(0, 10 - ((occ - 0.2) / 0.25) * 10);
      }
    } else {
      // balanced: reward mid occupation band
      if (occ >= 0.18 && occ <= 0.32) {
        capacityIntentScore = 10;
      } else if (occ < 0.18) {
        capacityIntentScore = (occ / 0.18) * 10;
      } else {
        capacityIntentScore = Math.max(0, 10 - ((occ - 0.32) / 0.3) * 10);
      }
    }
  }

  // --- layoutAesthetics (10 pts): order, centering, no extreme elongation ---
  let layoutAestheticsScore = 10;
  if (placed.length > 1) {
    let elongationPenalty = 0;
    if (aspectRatio > 2.5) {
      elongationPenalty = Math.min(5, ((aspectRatio - 2.5) / 5) * 5);
    }
    let centeringPenalty = 0;
    if (distToCentroid >= 8) {
      centeringPenalty = Math.min(3, (distToCentroid - 8) / 15);
    }
    let bigRowPenalty = 0;
    if (candidate.shape?.kind === "single_row" && bessCount >= 12) {
      bigRowPenalty = 2;
    }
    layoutAestheticsScore = Math.max(
      0,
      10 - elongationPenalty - centeringPenalty - bigRowPenalty
    );
  }

  const sum =
    insidePolygonScore +
    noCollisionsScore +
    boundaryMarginScore +
    siteUtilizationScore +
    rowRegularityScore +
    corridorEfficiencyScore +
    ratioComplianceScore +
    shapeCompactnessScore +
    terrainFitScore +
    pcsIntegrationScore +
    capacityIntentScore +
    layoutAestheticsScore;

  // Scale back to 100 max (max possible raw = 150)
  const total = (sum / 150) * 100;

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
    siteUtilizationPct: parseFloat((ratio * 100).toFixed(1)),
    terrainFit: parseFloat(terrainFitScore.toFixed(2)),
    pcsIntegration: parseFloat(pcsIntegrationScore.toFixed(2)),
    capacityIntent: parseFloat(capacityIntentScore.toFixed(2)),
    layoutAesthetics: parseFloat(layoutAestheticsScore.toFixed(2)),
  };
}

export function rankSmartSiteFitCandidates(
  candidates: SmartSiteFitCandidate[],
  polygon: LocalPoint[],
  anchor: ProjectAnchor,
  durationHours: number,
  targetRatio?: number
): SmartSiteFitCandidate[] {
  return candidates
    .map((c) => {
      const score = scoreCandidate(c, polygon, anchor, durationHours, targetRatio);
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

/**
 * Dominant orientation bucket of an alternative (0 = principal terrain axis,
 * 90 = perpendicular). All equipment in a candidate shares one placement
 * rotation, so the first item is representative. The exact dominant angle may be
 * e.g. 37°, so we bucket to the nearest principal axis rather than the raw value.
 */
function diversityOrientationBucket(candidate: SmartSiteFitCandidate): 0 | 90 {
  const raw = candidate.placedEquipment[0]?.rotation_deg ?? 0;
  const norm = ((Math.round(raw) % 180) + 180) % 180;
  return norm >= 45 && norm < 135 ? 90 : 0;
}

/**
 * Diversity signature: shape family + dominant orientation + block count. Two
 * candidates sharing a signature are near-duplicates (same layout family, same
 * orientation), so only the higher-scoring one is worth surfacing.
 */
function diversitySignature(candidate: SmartSiteFitCandidate): string {
  const kind = candidate.shape?.kind ?? "custom";
  const blocks = candidate.shape?.blocks ?? 1;
  return `${kind}|${diversityOrientationBucket(candidate)}|${blocks}`;
}

/**
 * A candidate is eligible to fill the requested floor only when it is a fully
 * valid placement: every corner inside the polygon and no overlaps. Both
 * sub-scores are graded out of 25 (see `scoreCandidate`), so a clean layout
 * scores ~25 on each. We never pad the floor with out-of-bounds or colliding
 * layouts — only with real, buildable variants.
 */
function isFullyPlaced(candidate: SmartSiteFitCandidate): boolean {
  return candidate.score.insidePolygon >= 24.9 && candidate.score.noCollisions >= 24.9;
}

/**
 * Finer dedupe key than `diversitySignature` (which buckets orientation to
 * 0/90): family + block count + exact rounded rotation. Used when filling the
 * floor so two surfaced variants always differ by a visible amount (a distinct
 * rotation), never as pixel-identical cards.
 */
function finePlacementKey(candidate: SmartSiteFitCandidate): string {
  const kind = candidate.shape?.kind ?? "custom";
  const blocks = candidate.shape?.blocks ?? 1;
  const rotation = Math.round(candidate.placedEquipment[0]?.rotation_deg ?? 0);
  return `${kind}|${blocks}|${rotation}`;
}

/**
 * Pick distinct alternatives from a score-ranked list, targeting `min`..`limit`
 * results.
 *
 * Target sizing explores many near-identical layouts (the same shape family at
 * slightly different rotations/shifts). This keeps one representative per shape
 * family first — the highest-scoring, since the input is pre-sorted — then fills
 * with the next-best candidates that differ by full signature (family +
 * orientation + block count), up to `limit`.
 *
 * If after those two passes there are still fewer than `min` results, a third
 * pass tops up to `min` with the next best *valid* placements (fully inside,
 * collision-free) that differ by a finer key (a distinct rotation). This honors
 * a requested minimum (e.g. always offer 8–12 options) without ever padding with
 * invalid or pixel-identical layouts: when the terrain genuinely admits fewer
 * buildable layouts, it returns fewer and the caller explains that honestly. The
 * first result is always the global best, so callers can pre-select `result[0]`.
 */
export function selectDiverseAlternatives(
  ranked: SmartSiteFitCandidate[],
  opts: { limit?: number; min?: number } = {}
): SmartSiteFitCandidate[] {
  const limit = Math.max(1, opts.limit ?? 12);
  const min = Math.max(0, Math.min(opts.min ?? 0, limit));
  if (ranked.length <= limit) return ranked.slice();

  const result: SmartSiteFitCandidate[] = [];
  const chosen = new Set<SmartSiteFitCandidate>();
  const seenFamilies = new Set<string>();
  const seenSignatures = new Set<string>();

  // Pass 1: one representative per shape family (best score first).
  for (const candidate of ranked) {
    if (result.length >= limit) break;
    const family = candidate.shape?.kind ?? "custom";
    if (seenFamilies.has(family)) continue;
    seenFamilies.add(family);
    seenSignatures.add(diversitySignature(candidate));
    result.push(candidate);
    chosen.add(candidate);
  }

  // Pass 2: fill remaining slots with distinct full signatures — a different
  // orientation or block count of an already-shown family.
  if (result.length < limit) {
    for (const candidate of ranked) {
      if (result.length >= limit) break;
      const signature = diversitySignature(candidate);
      if (seenSignatures.has(signature)) continue;
      seenSignatures.add(signature);
      result.push(candidate);
      chosen.add(candidate);
    }
  }

  // Pass 3: top up to the requested floor with the next best valid placements,
  // relaxing only the distinctness rule (still deduped by a finer rotation key)
  // and never the validity rule.
  if (result.length < min) {
    const seenFine = new Set<string>(result.map(finePlacementKey));
    for (const candidate of ranked) {
      if (result.length >= min) break;
      if (chosen.has(candidate)) continue;
      if (!isFullyPlaced(candidate)) continue;
      const fine = finePlacementKey(candidate);
      if (seenFine.has(fine)) continue;
      seenFine.add(fine);
      result.push(candidate);
      chosen.add(candidate);
    }
  }

  return result;
}
