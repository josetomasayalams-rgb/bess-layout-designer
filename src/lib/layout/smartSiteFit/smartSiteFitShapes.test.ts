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

  it("should keep each PCS attached to its own BESS cluster in a compact_grid (no PCS wall)", () => {
    const pcsCount = 4;
    const containersPerPcs = 8;
    const shapes = generateSmartSiteFitShapes({
      bessCount: pcsCount * containersPerPcs,
      pcsCount,
      containersPerPcs,
      strategy: "balanced",
    });
    const compactShape = shapes.find((s) => s.kind === "compact_grid")!;
    expect(compactShape).toBeDefined();

    const items = buildShapeLayout(compactShape, pcsCount, containersPerPcs, {
      bessToBess: 3.0,
      bessToPcs: 3.0,
      pcsToPcs: 3.0,
    });

    expect(items.length).toBe(pcsCount + pcsCount * containersPerPcs);

    const pcsItems = items.filter((i) => i.equipmentSpecId === "sungrow-sc5000ud-mv-us-p3");
    expect(pcsItems.length).toBe(pcsCount);

    // Each PCS must be close to a BESS that shares its block index (its cluster).
    for (const pcs of pcsItems) {
      const clusterBess = items.filter(
        (i) =>
          i.equipmentSpecId === "sungrow-st2752ux-us" && i.blockIndex === pcs.blockIndex
      );
      expect(clusterBess.length).toBe(containersPerPcs);
      const nearest = Math.min(
        ...clusterBess.map((b) =>
          Math.sqrt((b.x_m - pcs.x_m) ** 2 + (b.y_m - pcs.y_m) ** 2)
        )
      );
      // PCS sits at the operative edge of its own sub-grid — well under a block width.
      expect(nearest).toBeLessThan(20);
    }

    // PCS should NOT all share the same x (which would be a detached vertical wall).
    const uniquePcsX = new Set(pcsItems.map((p) => Math.round(p.x_m)));
    expect(uniquePcsX.size).toBeGreaterThan(1);
  });
});
