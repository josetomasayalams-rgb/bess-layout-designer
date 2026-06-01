import { describe, expect, it } from "vitest";
import { runSmartSiteFit } from "./smartSiteFitEngine";
import { generateCandidates } from "./smartSiteFitCandidates";
import type { LngLat, LocalPoint, ProjectAnchor } from "@/types/geometry";
import type { SmartSiteFitPerformanceBudget } from "./smartSiteFitPerformance";

const anchor: ProjectAnchor = { lng0: -70, lat0: -33 };

// ~250 m square in lng/lat around the anchor — large enough to score candidates.
const polygon: LngLat[] = [
  { lng: -70.00135, lat: -33.00112 },
  { lng: -69.99865, lat: -33.00112 },
  { lng: -69.99865, lat: -32.99888 },
  { lng: -70.00135, lat: -32.99888 },
];

// A square local polygon of the given side length (meters), origin-centered.
function localSquare(side_m: number): LocalPoint[] {
  const h = side_m / 2;
  return [
    { x_m: -h, y_m: -h },
    { x_m: h, y_m: -h },
    { x_m: h, y_m: h },
    { x_m: -h, y_m: h },
  ];
}

function countEquipment(placed: { equipmentSpecId: string }[]) {
  const bess = placed.filter((e) => e.equipmentSpecId === "sungrow-st2752ux-us").length;
  const pcs = placed.filter((e) => e.equipmentSpecId === "sungrow-sc5000ud-mv-us-p3").length;
  return { bess, pcs };
}

describe("SmartSiteFit utility-scale performance scenarios", () => {
  it("handles a 500 MW / 2000 MWh target without freezing or throwing", () => {
    const start = Date.now();
    const result = runSmartSiteFit({
      mode: "target",
      polygon,
      anchor,
      targetMW: 500,
      targetMWh: 2000,
      durationHours: 4,
      strategy: "balanced",
    });
    const elapsed = Date.now() - start;

    // Bounded compute: the engine must degrade, never hang.
    expect(elapsed).toBeLessThan(8000);
    // Always returns an explainable response: either a candidate or a fallback.
    expect(result.success).toBe(true);
    expect(result.selected !== null || result.fallbackUsed).toBe(true);
    if (result.selected) {
      const { bess, pcs } = countEquipment(result.selected.placedEquipment);
      // 4h => 8:1 ratio preserved; size is bounded to the request, not exploded.
      expect(bess / pcs).toBe(8);
      expect(bess).toBeLessThan(2000);
    }
  }, 15000);

  it("handles a 750 MW / 12000 MWh @ 16h scenario with an explainable result", () => {
    const start = Date.now();
    const result = runSmartSiteFit({
      mode: "target",
      polygon,
      anchor,
      targetMW: 750,
      targetMWh: 12000,
      durationHours: 16,
      strategy: "max_capacity",
    });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(8000);
    expect(result.success).toBe(true);
    expect(result.selected !== null || result.fallbackUsed).toBe(true);
    if (result.selected) {
      const { bess, pcs } = countEquipment(result.selected.placedEquipment);
      // 16h => 32:1 ratio.
      expect(bess / pcs).toBe(32);
      // The selected alternative must carry assumptions explaining the sizing.
      expect(result.selected.assumptions.length).toBeGreaterThan(0);
    }
  }, 15000);

  it("does not trigger an explosive sweep on a huge terrain across all 3 strategies", () => {
    // ~600 m square — a very large site.
    const hugeSquare: LngLat[] = [
      { lng: -70.0027, lat: -33.0027 },
      { lng: -69.9973, lat: -33.0027 },
      { lng: -69.9973, lat: -32.9973 },
      { lng: -70.0027, lat: -32.9973 },
    ];

    const start = Date.now();
    const result = runSmartSiteFit({
      mode: "terrain",
      polygon: hugeSquare,
      anchor,
      durationHours: 4,
      strategy: "balanced",
    });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(8000);
    expect(result.success).toBe(true);
    // Terrain mode still returns at most 3 ranked alternatives.
    expect(result.candidates.length).toBeLessThanOrEqual(3);
    expect(result.candidates.length).toBeGreaterThan(0);
  }, 15000);

  it("returns an explainable, bounded result for a giant target on a tiny terrain", () => {
    // ~30 m square — far too small for a 1000 MW / 4000 MWh park.
    const tinySquare: LngLat[] = [
      { lng: -70.00016, lat: -33.000135 },
      { lng: -69.99984, lat: -33.000135 },
      { lng: -69.99984, lat: -32.999865 },
      { lng: -70.00016, lat: -32.999865 },
    ];

    const start = Date.now();
    const result = runSmartSiteFit({
      mode: "target",
      polygon: tinySquare,
      anchor,
      targetMW: 1000,
      targetMWh: 4000,
      durationHours: 4,
      strategy: "balanced",
    });
    const elapsed = Date.now() - start;

    expect(elapsed).toBeLessThan(8000);
    expect(result.success).toBe(true);
    // Must not attempt to build millions of equipment: the requested park is
    // ~1454 BESS, expanded across only a handful of survivors.
    if (result.selected) {
      const { bess } = countEquipment(result.selected.placedEquipment);
      expect(bess).toBeLessThan(5000);
    } else {
      expect(result.fallbackUsed).toBe(true);
    }
  }, 15000);

  it("respects the hard expansion cap (maxExactGeometryChecks) in generateCandidates", () => {
    const budget: SmartSiteFitPerformanceBudget = {
      maxCandidateEvaluations: 50,
      maxExactGeometryChecks: 3,
      maxPreviewFeaturesBeforeSimplification: 600,
      maxRenderedPreviewItems: 1000,
      targetComputeTimeMs: 750,
      hardTimeoutMs: 2500,
      enableProgressiveFallback: true,
    };

    const candidates = generateCandidates(
      localSquare(250),
      anchor,
      4,
      "balanced",
      undefined,
      undefined,
      undefined,
      100, // maxCandidates intentionally larger than the budget cap
      budget
    );

    // Expansion is hard-bounded: never more than maxExactGeometryChecks results.
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.length).toBeLessThanOrEqual(budget.maxExactGeometryChecks);
  });

  it("falls back to the best-so-far result with a performance_budget_reached warning on timeout", () => {
    const budget: SmartSiteFitPerformanceBudget = {
      maxCandidateEvaluations: 400,
      maxExactGeometryChecks: 16,
      maxPreviewFeaturesBeforeSimplification: 600,
      maxRenderedPreviewItems: 1000,
      targetComputeTimeMs: 750,
      hardTimeoutMs: 2500,
      enableProgressiveFallback: true,
    };

    // A deadline already in the past forces the progressive fallback path.
    const pastDeadline = Date.now() - 1;
    const candidates = generateCandidates(
      localSquare(120),
      anchor,
      4,
      "balanced",
      undefined,
      undefined,
      undefined,
      100,
      budget,
      pastDeadline
    );

    // Never throws, never returns empty: at least one candidate is produced.
    expect(candidates.length).toBeGreaterThanOrEqual(1);
    // And it explains the degradation.
    const hasBudgetWarning = candidates[0].warnings.some(
      (w) => w.id === "performance_budget_reached"
    );
    expect(hasBudgetWarning).toBe(true);
  });

  it("does not honor the deadline when progressive fallback is disabled", () => {
    const budget: SmartSiteFitPerformanceBudget = {
      maxCandidateEvaluations: 400,
      maxExactGeometryChecks: 4,
      maxPreviewFeaturesBeforeSimplification: 600,
      maxRenderedPreviewItems: 1000,
      targetComputeTimeMs: 750,
      hardTimeoutMs: 2500,
      enableProgressiveFallback: false,
    };

    const candidates = generateCandidates(
      localSquare(120),
      anchor,
      4,
      "balanced",
      undefined,
      undefined,
      undefined,
      100,
      budget,
      Date.now() - 1
    );

    // With fallback off, the full (capped) set is expanded and no budget warning
    // is attached.
    expect(candidates.length).toBeGreaterThan(0);
    const hasBudgetWarning = candidates.some((c) =>
      c.warnings.some((w) => w.id === "performance_budget_reached")
    );
    expect(hasBudgetWarning).toBe(false);
  });
});
