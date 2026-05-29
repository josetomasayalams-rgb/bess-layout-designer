import type { SmartSiteFitShapeKind, SmartSiteFitStrategy } from "./smartSiteFitTypes";

/**
 * Computational (NOT capacity) budgets for SmartSiteFit. These bound how much
 * work the engine and the map preview are allowed to do so utility-scale
 * scenarios (hundreds/thousands of containers) never freeze the UI. They never
 * cap the final MW/MWh the project can request — they only reduce search
 * resolution and simplify the preview, degrading with an explanation.
 */
export interface SmartSiteFitPerformanceBudget {
  /** Hard cap on cheap skeletons fast-scored before pruning. */
  maxCandidateEvaluations: number;
  /** Cap on candidates expanded to real equipment + exact-scored. */
  maxExactGeometryChecks: number;
  /** Preview switches to simplified (aggregated) rendering above this feature count. */
  maxPreviewFeaturesBeforeSimplification: number;
  /** Upper bound on representative items drawn in simplified preview mode. */
  maxRenderedPreviewItems: number;
  /** Soft target for engine compute time. */
  targetComputeTimeMs: number;
  /** Hard wall: past this the engine returns best-so-far with a warning. */
  hardTimeoutMs: number;
  /** When true, a hit deadline returns a partial result instead of nothing. */
  enableProgressiveFallback: boolean;
}

export const DEFAULT_PERFORMANCE_BUDGET: SmartSiteFitPerformanceBudget = {
  maxCandidateEvaluations: 1200,
  maxExactGeometryChecks: 24,
  maxPreviewFeaturesBeforeSimplification: 600,
  maxRenderedPreviewItems: 1000,
  targetComputeTimeMs: 750,
  hardTimeoutMs: 2500,
  enableProgressiveFallback: true,
};

export type CandidateSearchTier = "small" | "medium" | "large";

export interface CandidateSearchPlan {
  tier: CandidateSearchTier;
  /** How many entries of the rotation list to explore. */
  rotationsToTry: number;
  /** Grid offset samples (meters) to try on each axis. */
  gridShifts: number[];
  /** Multipliers of the target block count to explore (terrain mode only). */
  blockCountFactors: number[];
  /** Cap on cheap skeletons generated + fast-scored. */
  maxSkeletons: number;
  /** Cap on skeletons expanded to real equipment + exact-scored. */
  expandTopN: number;
}

/**
 * Adaptive search plan. Small layouts get a thorough sweep; giant layouts get a
 * focused one (fewer rotations/shifts, single block size, far fewer expansions)
 * so the cost stays bounded regardless of MW/MWh.
 */
export function getCandidateSearchPlan(
  estimatedEquipmentCount: number,
  _strategy: SmartSiteFitStrategy,
  budget: SmartSiteFitPerformanceBudget = DEFAULT_PERFORMANCE_BUDGET
): CandidateSearchPlan {
  if (estimatedEquipmentCount < 200) {
    return {
      tier: "small",
      rotationsToTry: 4,
      gridShifts: [-10, 0, 10],
      blockCountFactors: [1, 0.75, 0.5],
      maxSkeletons: Math.min(budget.maxCandidateEvaluations, 400),
      expandTopN: Math.min(budget.maxExactGeometryChecks, 16),
    };
  }
  if (estimatedEquipmentCount <= 800) {
    return {
      tier: "medium",
      rotationsToTry: 2,
      gridShifts: [0, 10],
      blockCountFactors: [1, 0.75],
      maxSkeletons: Math.min(budget.maxCandidateEvaluations, 200),
      expandTopN: Math.min(budget.maxExactGeometryChecks, 8),
    };
  }
  return {
    tier: "large",
    rotationsToTry: 1,
    gridShifts: [0],
    blockCountFactors: [1],
    maxSkeletons: Math.min(budget.maxCandidateEvaluations, 60),
    expandTopN: Math.min(budget.maxExactGeometryChecks, 3),
  };
}

export function classifyAspect(aspect: number): "wide" | "deep" | "square" {
  return aspect > 1.3 ? "wide" : aspect < 0.77 ? "deep" : "square";
}

/**
 * Cheap, equipment-free estimate used to prune skeletons before the expensive
 * exact scoring. All inputs come from shape dimensions + polygon bbox/area, so
 * this is O(1) per candidate.
 */
export interface CandidateFastScore {
  roughTerrainFit: number; // 0..1
  roughCapacityFit: number; // 0..1
  roughAspectRatio: number;
  viable: boolean;
  estWidth_m: number;
  estHeight_m: number;
  total: number; // weighted 0..1 used to rank skeletons
}

export function computeFastScore(args: {
  estWidth_m: number;
  estHeight_m: number;
  occupiedArea_m2: number;
  terrainW_m: number;
  terrainH_m: number;
  terrainArea_m2: number;
  strategy: SmartSiteFitStrategy;
  shapeKind: SmartSiteFitShapeKind;
  bessCount: number;
  isTargetMode: boolean;
  boundaryMargin_m: number;
}): CandidateFastScore {
  const {
    estWidth_m,
    estHeight_m,
    occupiedArea_m2,
    terrainW_m,
    terrainH_m,
    terrainArea_m2,
    strategy,
    shapeKind,
    bessCount,
    isTargetMode,
    boundaryMargin_m,
  } = args;

  const w = Math.max(0.1, estWidth_m);
  const h = Math.max(0.1, estHeight_m);
  const roughAspectRatio = Math.max(w, h) / Math.min(w, h);
  const layoutAspect = w / h;
  const terrainAspect = Math.max(0.1, terrainW_m) / Math.max(0.1, terrainH_m);

  // Terrain fit: same orientation class is best.
  const layoutClass = classifyAspect(layoutAspect);
  const terrainClass = classifyAspect(terrainAspect);
  let roughTerrainFit: number;
  if (layoutClass === terrainClass) roughTerrainFit = 1.0;
  else if (layoutClass === "square" || terrainClass === "square") roughTerrainFit = 0.6;
  else roughTerrainFit = 0.2;

  // Capacity intent: occupancy aligned with the strategy band.
  const occ = terrainArea_m2 > 0 ? occupiedArea_m2 / terrainArea_m2 : 0;
  let roughCapacityFit: number;
  if (strategy === "max_capacity") {
    roughCapacityFit = occ >= 0.3 ? 1 : Math.max(0, occ / 0.3);
  } else if (strategy === "conservative") {
    roughCapacityFit =
      occ <= 0.2 ? (occ >= 0.08 ? 1 : occ / 0.08) : Math.max(0, 1 - (occ - 0.2) / 0.25);
  } else {
    roughCapacityFit =
      occ >= 0.18 && occ <= 0.32
        ? 1
        : occ < 0.18
        ? occ / 0.18
        : Math.max(0, 1 - (occ - 0.32) / 0.3);
  }

  // Compactness: penalize elongated and absurd single-row layouts.
  let compactness = 1;
  if (roughAspectRatio > 3.0) {
    compactness = Math.max(0, 1 - (roughAspectRatio - 3.0) / 6.0);
  }
  if (shapeKind === "single_row" && bessCount >= 8) {
    compactness = Math.max(0, compactness - 0.3);
  }

  // Viability: does the footprint (+ setback) fit the terrain bbox in either
  // orientation? Rotation is explored separately, so allow the swapped fit too.
  const m = 2 * boundaryMargin_m;
  const fitsDirect = w + m <= terrainW_m && h + m <= terrainH_m;
  const fitsRotated = h + m <= terrainW_m && w + m <= terrainH_m;
  // Target mode always keeps the requested size (the app explains overflow
  // rather than refusing it); terrain mode prefers genuinely fitting layouts.
  const viable = isTargetMode ? true : fitsDirect || fitsRotated;

  let total =
    roughTerrainFit * 0.4 + roughCapacityFit * 0.4 + compactness * 0.2;
  if (!viable) total *= 0.25;

  return {
    roughTerrainFit,
    roughCapacityFit,
    roughAspectRatio,
    viable,
    estWidth_m: w,
    estHeight_m: h,
    total,
  };
}
