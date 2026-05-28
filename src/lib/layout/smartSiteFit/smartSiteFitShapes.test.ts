import { describe, expect, it } from "vitest";
import { generateSmartSiteFitShapes, buildShapeLayout } from "./smartSiteFitShapes";

describe("SmartSiteFit Shapes", () => {
  it("should generate multiple shapes for 8 BESS / 1 PCS", () => {
    const shapes = generateSmartSiteFitShapes({
      bessCount: 8,
      pcsCount: 1,
      containersPerPcs: 8,
      strategy: "balanced",
    });

    expect(shapes.length).toBeGreaterThan(1);
    const kinds = shapes.map((s) => s.kind);
    expect(kinds).toContain("single_row");
    expect(kinds).toContain("two_row_block");
    expect(kinds).toContain("compact_grid");
  });

  it("should build correct layout coordinates for single_row", () => {
    const shapes = generateSmartSiteFitShapes({
      bessCount: 8,
      pcsCount: 1,
      containersPerPcs: 8,
      strategy: "balanced",
    });
    const singleRowShape = shapes.find((s) => s.kind === "single_row")!;
    expect(singleRowShape).toBeDefined();

    const items = buildShapeLayout(singleRowShape, 1, 8, {
      bessToBess: 3.0,
      bessToPcs: 3.0,
      pcsToPcs: 3.0,
    });

    // 1 PCS + 8 BESS = 9 items
    expect(items.length).toBe(9);
    const pcs = items.filter((i) => i.equipmentSpecId === "sungrow-sc5000ud-mv-us-p3");
    const bess = items.filter((i) => i.equipmentSpecId === "sungrow-st2752ux-us");

    expect(pcs.length).toBe(1);
    expect(bess.length).toBe(8);
  });

  it("should build correct layout coordinates for two_row_block", () => {
    const shapes = generateSmartSiteFitShapes({
      bessCount: 16,
      pcsCount: 2,
      containersPerPcs: 8,
      strategy: "balanced",
    });
    const twoRowShape = shapes.find((s) => s.kind === "two_row_block")!;
    expect(twoRowShape).toBeDefined();

    const items = buildShapeLayout(twoRowShape, 2, 8, {
      bessToBess: 3.0,
      bessToPcs: 3.0,
      pcsToPcs: 3.0,
    });

    expect(items.length).toBe(18); // 2 PCS + 16 BESS
    const pcs = items.filter((i) => i.equipmentSpecId === "sungrow-sc5000ud-mv-us-p3");
    const bess = items.filter((i) => i.equipmentSpecId === "sungrow-st2752ux-us");

    expect(pcs.length).toBe(2);
    expect(bess.length).toBe(16);
  });
});
