import { nanoid } from "nanoid";
import type { LocalPoint, ProjectAnchor } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";
import type {
  SmartSiteFitCandidate,
  SmartSiteFitShapeCandidate,
  SmartSiteFitStrategy,
  SmartSiteFitWarning,
  SmartSiteFitAssumption,
  SmartSiteFitOverrides,
} from "./smartSiteFitTypes";
import { getContainersPerPcsForDuration } from "./smartSiteFitPresets";
import { toLngLat } from "@/lib/geometry/projection";
import { analyzePolygon } from "./smartSiteFitGeometry";
import {
  generateSmartSiteFitShapes,
  buildShapeLayout,
  estimateShapeFootprint,
} from "./smartSiteFitShapes";
import {
  DEFAULT_PERFORMANCE_BUDGET,
  getCandidateSearchPlan,
  computeFastScore,
  type SmartSiteFitPerformanceBudget,
  type CandidateFastScore,
} from "./smartSiteFitPerformance";

// Sungrow footprint constants used for the equipment-free area estimate.
const BESS_LENGTH_M = 9.34;
const BESS_WIDTH_M = 1.73;
const PCS_LENGTH_M = 6.058;
const PCS_WIDTH_M = 2.438;
const BESS_AREA_M2 = BESS_LENGTH_M * BESS_WIDTH_M;
const PCS_AREA_M2 = PCS_LENGTH_M * PCS_WIDTH_M;

interface PlacementOption {
  rotationDeg: number;
  cos: number;
  sin: number;
  dx: number;
  dy: number;
}

interface ShapeJob {
  blocks: number;
  shape: SmartSiteFitShapeCandidate;
  fast: CandidateFastScore;
}

/**
 * Generate ranked layout candidates for a polygon.
 *
 * Performance model (utility-scale safe): instead of building full
 * `PlacedEquipment[]` for every rotation × shift × block-count × shape combo
 * (which explodes for thousands of containers), we
 *   1. enumerate cheap, equipment-free *skeletons* per (block-count, shape),
 *   2. fast-score them with an O(1) heuristic,
 *   3. prune to the best `expandTopN` per the adaptive search plan, and
 *   4. only then expand the survivors into real equipment.
 *
 * `budget` / `deadlineAt` bound the work without ever capping the requested
 * MW/MWh: on a hit deadline the best survivors found so far are returned with a
 * `performance_budget_reached` warning instead of throwing or freezing.
 */
export function generateCandidates(
  polygon: LocalPoint[],
  anchor: ProjectAnchor,
  durationHours: number,
  strategy: SmartSiteFitStrategy,
  overrides?: SmartSiteFitOverrides,
  targetMW?: number,
  targetMWh?: number,
  maxCandidates: number = 100,
  budget: SmartSiteFitPerformanceBudget = DEFAULT_PERFORMANCE_BUDGET,
  deadlineAt?: number
): SmartSiteFitCandidate[] {
  if (polygon.length < 3) return [];

  const analysis = analyzePolygon(polygon);
  const centroid = analysis.centroid;
  const dominantAngle = analysis.orientationDeg;
  const terrainW_m = Math.max(0.1, analysis.bounds.maxX - analysis.bounds.minX);
  const terrainH_m = Math.max(0.1, analysis.bounds.maxY - analysis.bounds.minY);

  // Spacings based on strategy
  let bessToBess = 3.0;
  let bessToPcs = 3.0;
  let pcsToPcs = 3.0;

  if (strategy === "max_capacity") {
    bessToBess = 2.5;
    bessToPcs = 2.5;
    pcsToPcs = 2.5;
  } else if (strategy === "conservative") {
    bessToBess = 4.0;
    bessToPcs = 4.0;
    pcsToPcs = 4.0;
  }

  // Apply overrides if present
  if (overrides) {
    if (overrides.bessToBess_m !== undefined) bessToBess = overrides.bessToBess_m;
    if (overrides.bessToPcs_m !== undefined) bessToPcs = overrides.bessToPcs_m;
    if (overrides.pcsToPcs_m !== undefined) pcsToPcs = overrides.pcsToPcs_m;
  }
  const boundaryMargin_m = overrides?.boundaryMargin_m ?? 0;
  const spacing = { bessToBess, bessToPcs, pcsToPcs };

  const bessPerPcs = getContainersPerPcsForDuration(durationHours);

  // Block length along row for target block counting
  const blockLength = PCS_LENGTH_M + bessToPcs + bessPerPcs * (BESS_LENGTH_M + bessToBess) - bessToBess;
  const blockWidth = Math.max(PCS_WIDTH_M, BESS_WIDTH_M);

  // Determine target block count
  let targetBlockCount = 1;
  const isTargetMode = targetMW !== undefined || targetMWh !== undefined;

  if (isTargetMode) {
    // 5 MW per PCS station
    const pcsFromPower = targetMW ? Math.ceil(targetMW / 5.0) : 0;
    // 2.752 MWh per BESS container
    const bessNeeded = targetMWh ? Math.ceil(targetMWh / 2.752) : 0;
    const pcsFromEnergy = Math.ceil(bessNeeded / bessPerPcs);
    targetBlockCount = Math.max(1, Math.max(pcsFromPower, pcsFromEnergy));
  } else {
    // Terrain mode: calculate max blocks based on polygon area
    const blockArea = (blockLength + pcsToPcs) * (blockWidth + bessToBess);
    const maxTheoreticalBlocks = Math.max(1, Math.floor(analysis.area_m2 / blockArea));
    targetBlockCount = Math.min(200, maxTheoreticalBlocks);
  }

  // Adaptive search plan: small layouts get a thorough sweep, giant layouts a
  // focused one. The estimated equipment count drives the resolution.
  const estimatedEquipmentCount = targetBlockCount * (bessPerPcs + 1);
  const plan = getCandidateSearchPlan(estimatedEquipmentCount, strategy, budget);

  // Pre-configured warnings & assumptions
  const warnings: SmartSiteFitWarning[] = [
    {
      id: "sungrow-integrated-transformer",
      severity: "info",
      message: "SC5000UD-MV integra transformador BT/MT y no se debe crear transformador separado.",
    },
  ];

  const assumptions: SmartSiteFitAssumption[] = [
    {
      id: "bess-model",
      description: "Modelo de BESS utilizado",
      value: "sungrow-st2752ux-us",
      classification: "preliminary_assumption",
    },
    {
      id: "pcs-model",
      description: "Modelo de PCS utilizado",
      value: "sungrow-sc5000ud-mv-us-p3",
      classification: "preliminary_assumption",
    },
    {
      id: "bess-pcs-ratio",
      description: "Relación de BESS a PCS basada en duración de diseño",
      value: `${bessPerPcs}:1`,
      classification: "preliminary_assumption",
    },
  ];

  // Block-count candidates. Target mode always keeps the requested size; terrain
  // mode may downsize per the search plan to find a layout that actually fits.
  const blockCountFactors = isTargetMode ? [1] : plan.blockCountFactors;
  const blockCountsToTry = Array.from(
    new Set(
      blockCountFactors.map((f) => (f === 1 ? targetBlockCount : Math.floor(targetBlockCount * f)))
    )
  )
    .filter((v) => v > 0)
    .sort((a, b) => b - a);

  // --- Phase 1: cheap, equipment-free skeletons + fast score (prune step) ---
  const shapeJobs: ShapeJob[] = [];
  for (const blocks of blockCountsToTry) {
    if (shapeJobs.length >= plan.maxSkeletons) break;

    const shapes = generateSmartSiteFitShapes({
      bessCount: blocks * bessPerPcs,
      pcsCount: blocks,
      containersPerPcs: bessPerPcs,
      strategy,
    });

    const filteredShapes =
      overrides?.preferredShapeKind && overrides.preferredShapeKind !== "auto"
        ? shapes.filter((s) => s.kind === overrides.preferredShapeKind)
        : shapes;
    const shapesToTry = filteredShapes.length > 0 ? filteredShapes : shapes;

    for (const shape of shapesToTry) {
      if (shapeJobs.length >= plan.maxSkeletons) break;

      const footprint = estimateShapeFootprint(shape, blocks, bessPerPcs, spacing);
      const occupiedArea_m2 = blocks * bessPerPcs * BESS_AREA_M2 + blocks * PCS_AREA_M2;
      const fast = computeFastScore({
        estWidth_m: footprint.width_m,
        estHeight_m: footprint.height_m,
        occupiedArea_m2,
        terrainW_m,
        terrainH_m,
        terrainArea_m2: analysis.area_m2,
        strategy,
        shapeKind: shape.kind,
        bessCount: blocks * bessPerPcs,
        isTargetMode,
        boundaryMargin_m,
      });
      shapeJobs.push({ blocks, shape, fast });
    }
  }

  if (shapeJobs.length === 0) return [];

  // Best fast-scored shapes first.
  shapeJobs.sort((a, b) => b.fast.total - a.fast.total);

  // --- Placements: rotations × grid shifts, ordered most-natural-first ---
  const rotationDegs = [dominantAngle, dominantAngle + 90, 0, 90].slice(
    0,
    Math.max(1, plan.rotationsToTry)
  );
  const placements: PlacementOption[] = [];
  for (const rotationDeg of rotationDegs) {
    const rad = (rotationDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    for (const dx of plan.gridShifts) {
      for (const dy of plan.gridShifts) {
        placements.push({ rotationDeg, cos, sin, dx, dy });
      }
    }
  }
  // Natural placement (first rotation, no shift) first; cheaper shifts before
  // larger ones so the best shapes get their best placement expanded first.
  placements.sort((a, b) => {
    const ra = rotationDegs.indexOf(a.rotationDeg);
    const rb = rotationDegs.indexOf(b.rotationDeg);
    if (ra !== rb) return ra - rb;
    return Math.abs(a.dx) + Math.abs(a.dy) - (Math.abs(b.dx) + Math.abs(b.dy));
  });

  // --- Expansion queue: interleave placements across shapes (diversity first) ---
  // combinedRank = placementRank * numShapes + shapeRank, so the best placement
  // of every surviving shape is expanded before any second placement.
  const expandLimit = Math.max(
    1,
    Math.min(plan.expandTopN, budget.maxExactGeometryChecks, Math.max(1, maxCandidates))
  );

  const queue: Array<{ job: ShapeJob; placement: PlacementOption }> = [];
  for (let p = 0; p < placements.length; p++) {
    for (let s = 0; s < shapeJobs.length; s++) {
      queue.push({ job: shapeJobs[s], placement: placements[p] });
    }
  }

  // --- Phase 2: expand only the survivors into real equipment ---
  const candidates: SmartSiteFitCandidate[] = [];
  let deadlineHit = false;
  for (const { job, placement } of queue) {
    if (candidates.length >= expandLimit) break;
    // Always expand at least one candidate; only stop early once we have a
    // result to return, so the engine never freezes nor returns nothing.
    if (
      budget.enableProgressiveFallback &&
      deadlineAt !== undefined &&
      candidates.length >= 1 &&
      Date.now() > deadlineAt
    ) {
      deadlineHit = true;
      break;
    }

    const { cos, sin, dx, dy } = placement;
    const startCenterX = centroid.x_m + dx;
    const startCenterY = centroid.y_m + dy;

    const placedEquipment: PlacedEquipment[] = [];
    const shapeLayoutItems = buildShapeLayout(job.shape, job.blocks, bessPerPcs, spacing);

    for (const item of shapeLayoutItems) {
      const rx = startCenterX + item.x_m * cos - item.y_m * sin;
      const ry = startCenterY + item.x_m * sin + item.y_m * cos;
      const lngLat = toLngLat({ x_m: rx, y_m: ry }, anchor);

      placedEquipment.push({
        id: nanoid(8),
        equipmentSpecId: item.equipmentSpecId,
        anchor: lngLat,
        rotation_deg: placement.rotationDeg,
        groupId: `block-${item.blockIndex}`,
        blockId: `block-${item.blockIndex}`,
        classification: "preliminary_assumption",
        sourceReliability: "preliminary_assumption",
      });
    }

    candidates.push({
      id: nanoid(8),
      strategy,
      placedEquipment,
      score: {
        total: 0,
        insidePolygon: 0,
        noCollisions: 0,
        boundaryMargin: 0,
        siteUtilization: 0,
        rowRegularity: 0,
        corridorEfficiency: 0,
        ratioCompliance: 0,
        shapeCompactness: 0,
      },
      warnings,
      assumptions,
      shape: {
        id: job.shape.id,
        kind: job.shape.kind,
        label: job.shape.label,
        description: job.shape.description,
        rows: job.shape.rows,
        columns: job.shape.columns,
        blocks: job.shape.blocks,
        pcsPlacement: job.shape.pcsPlacement,
      },
    });
  }

  if (deadlineHit) {
    const budgetWarning: SmartSiteFitWarning = {
      id: "performance_budget_reached",
      severity: "info",
      message:
        "Se alcanzó el presupuesto de cómputo; se muestra el mejor resultado preliminar encontrado.",
    };
    const withBudget = [...warnings, budgetWarning];
    for (const c of candidates) {
      c.warnings = withBudget;
    }
  }

  return candidates;
}
