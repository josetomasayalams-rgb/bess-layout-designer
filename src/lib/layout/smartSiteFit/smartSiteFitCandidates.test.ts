import { describe, expect, it } from "vitest";
import { generateCandidates } from "./smartSiteFitCandidates";
import type { LocalPoint, ProjectAnchor } from "@/types/geometry";

describe("SmartSiteFit Candidates Generation", () => {
  const anchor: ProjectAnchor = { lng0: -70, lat0: -33 };
  const largeSquare: LocalPoint[] = [
    { x_m: -100, y_m: -100 },
    { x_m: 100, y_m: -100 },
    { x_m: 100, y_m: 100 },
    { x_m: -100, y_m: 100 },
  ];

  it("should generate no candidates for empty polygon", () => {
    const candidates = generateCandidates([], anchor, 4, "balanced");
    expect(candidates).toHaveLength(0);
  });

  it("should respect correct BESS-to-PCS ratio based on duration (4h -> 8:1)", () => {
    const candidates = generateCandidates(largeSquare, anchor, 4, "balanced", undefined, 10, 80);
    expect(candidates.length).toBeGreaterThan(0);
    const candidate = candidates[0];
    const bessCount = candidate.placedEquipment.filter(
      (e) => e.equipmentSpecId === "sungrow-st2752ux-us"
    ).length;
    const pcsCount = candidate.placedEquipment.filter(
      (e) => e.equipmentSpecId === "sungrow-sc5000ud-mv-us-p3"
    ).length;
    expect(bessCount / pcsCount).toBe(8);
  });

  it("should respect correct BESS-to-PCS ratio based on duration (2h -> 4:1)", () => {
    const candidates = generateCandidates(largeSquare, anchor, 2, "balanced", undefined, 10, 40);
    expect(candidates.length).toBeGreaterThan(0);
    const candidate = candidates[0];
    const bessCount = candidate.placedEquipment.filter(
      (e) => e.equipmentSpecId === "sungrow-st2752ux-us"
    ).length;
    const pcsCount = candidate.placedEquipment.filter(
      (e) => e.equipmentSpecId === "sungrow-sc5000ud-mv-us-p3"
    ).length;
    expect(bessCount / pcsCount).toBe(4);
  });

  it("should not exceed the 500 candidate generation limit", () => {
    const candidates = generateCandidates(largeSquare, anchor, 4, "max_capacity");
    expect(candidates.length).toBeLessThanOrEqual(500);
  });

  it("should not create separate transformer spec items", () => {
    const candidates = generateCandidates(largeSquare, anchor, 4, "balanced", undefined, 10, 80);
    expect(candidates.length).toBeGreaterThan(0);
    const hasTransformer = candidates[0].placedEquipment.some(
      (e) => e.equipmentSpecId.includes("transformer")
    );
    expect(hasTransformer).toBe(false);
  });

  it("should generate shape metadata on candidates", () => {
    const candidates = generateCandidates(largeSquare, anchor, 4, "balanced", undefined, 5, 40);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].shape).toBeDefined();
    expect(candidates[0].shape?.kind).toBeDefined();
  });

  it("should respect preferredShapeKind override if specified", () => {
    const candidates = generateCandidates(largeSquare, anchor, 4, "balanced", {
      preferredShapeKind: "two_row_block",
    }, 5, 40);
    expect(candidates.length).toBeGreaterThan(0);
    const kinds = new Set(candidates.map((c) => c.shape?.kind));
    expect(kinds.size).toBe(1);
    expect(kinds.has("two_row_block")).toBe(true);
  });
});

