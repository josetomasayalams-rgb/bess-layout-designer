import { describe, expect, it } from "vitest";
import {
  DEFAULT_PERFORMANCE_BUDGET,
  getCandidateSearchPlan,
  classifyAspect,
  computeFastScore,
} from "./smartSiteFitPerformance";

describe("SmartSiteFit performance budgets", () => {
  it("picks the small tier for tiny layouts and explores broadly", () => {
    const plan = getCandidateSearchPlan(50, "balanced");
    expect(plan.tier).toBe("small");
    expect(plan.rotationsToTry).toBeGreaterThanOrEqual(3);
    expect(plan.gridShifts.length).toBeGreaterThan(1);
    expect(plan.blockCountFactors.length).toBeGreaterThan(1);
  });

  it("picks the medium tier between 200 and 800 equipment", () => {
    const plan = getCandidateSearchPlan(500, "balanced");
    expect(plan.tier).toBe("medium");
    expect(plan.maxSkeletons).toBeLessThanOrEqual(DEFAULT_PERFORMANCE_BUDGET.maxCandidateEvaluations);
  });

  it("picks the large tier for giant layouts and collapses the search", () => {
    const plan = getCandidateSearchPlan(5000, "balanced");
    expect(plan.tier).toBe("large");
    expect(plan.rotationsToTry).toBe(1);
    expect(plan.gridShifts).toEqual([0]);
    expect(plan.blockCountFactors).toEqual([1]);
    // Far fewer expansions for a giant scenario than a small one.
    expect(plan.expandTopN).toBeLessThan(getCandidateSearchPlan(50, "balanced").expandTopN);
  });

  it("never lets maxSkeletons exceed the configured evaluation budget", () => {
    const tightBudget = { ...DEFAULT_PERFORMANCE_BUDGET, maxCandidateEvaluations: 10 };
    expect(getCandidateSearchPlan(50, "balanced", tightBudget).maxSkeletons).toBeLessThanOrEqual(10);
    expect(getCandidateSearchPlan(500, "balanced", tightBudget).maxSkeletons).toBeLessThanOrEqual(10);
    expect(getCandidateSearchPlan(5000, "balanced", tightBudget).maxSkeletons).toBeLessThanOrEqual(10);
  });

  it("never lets expandTopN exceed the exact-geometry budget", () => {
    const tightBudget = { ...DEFAULT_PERFORMANCE_BUDGET, maxExactGeometryChecks: 2 };
    expect(getCandidateSearchPlan(50, "balanced", tightBudget).expandTopN).toBeLessThanOrEqual(2);
    expect(getCandidateSearchPlan(5000, "balanced", tightBudget).expandTopN).toBeLessThanOrEqual(2);
  });

  it("classifies aspect ratios into wide / deep / square bands", () => {
    expect(classifyAspect(2.0)).toBe("wide");
    expect(classifyAspect(0.5)).toBe("deep");
    expect(classifyAspect(1.0)).toBe("square");
  });
});

describe("SmartSiteFit fast score", () => {
  const base = {
    occupiedArea_m2: 2000,
    terrainArea_m2: 40000,
    strategy: "balanced" as const,
    shapeKind: "compact_grid" as const,
    bessCount: 64,
    boundaryMargin_m: 5,
  };

  it("marks a footprint that overflows the terrain as non-viable in terrain mode", () => {
    const score = computeFastScore({
      ...base,
      estWidth_m: 500,
      estHeight_m: 500,
      terrainW_m: 200,
      terrainH_m: 200,
      isTargetMode: false,
    });
    expect(score.viable).toBe(false);
    // Non-viable layouts are heavily discounted so they sink in ranking.
    expect(score.total).toBeLessThan(0.3);
  });

  it("keeps an overflowing footprint viable in target mode (overflow is explained, not refused)", () => {
    const score = computeFastScore({
      ...base,
      estWidth_m: 500,
      estHeight_m: 500,
      terrainW_m: 200,
      terrainH_m: 200,
      isTargetMode: true,
    });
    expect(score.viable).toBe(true);
  });

  it("rewards a fitting layout whose orientation matches the terrain", () => {
    const matched = computeFastScore({
      ...base,
      estWidth_m: 150,
      estHeight_m: 40,
      terrainW_m: 200,
      terrainH_m: 60,
      isTargetMode: false,
    });
    const mismatched = computeFastScore({
      ...base,
      estWidth_m: 40,
      estHeight_m: 150,
      terrainW_m: 200,
      terrainH_m: 60,
      isTargetMode: false,
    });
    expect(matched.roughTerrainFit).toBeGreaterThan(mismatched.roughTerrainFit);
  });

  it("penalizes an absurdly elongated single row", () => {
    const grid = computeFastScore({
      ...base,
      shapeKind: "compact_grid",
      estWidth_m: 120,
      estHeight_m: 80,
      terrainW_m: 300,
      terrainH_m: 300,
      isTargetMode: false,
    });
    const row = computeFastScore({
      ...base,
      shapeKind: "single_row",
      estWidth_m: 800,
      estHeight_m: 5,
      terrainW_m: 300,
      terrainH_m: 300,
      isTargetMode: true,
    });
    expect(grid.total).toBeGreaterThan(row.total);
  });
});
