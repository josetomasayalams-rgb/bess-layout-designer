import { describe, expect, it } from "vitest";
import {
  generateSmartSiteFitShapes,
  buildShapeLayout,
  SUNGROW_SHAPE_EQUIPMENT,
} from "./smartSiteFitShapes";
import { defaultConstraints } from "@/data/defaultConstraints";

const constraintValue = (id: string) =>
  defaultConstraints.find((c) => c.id === id)!.value_m;
const SERVICE_CORRIDOR_M = constraintValue("service_corridor_width");
const BESS_WIDTH_M = SUNGROW_SHAPE_EQUIPMENT.bess.width_m;

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

  it("separates the two BESS rows of a two_row_block by the service corridor", () => {
    const containersPerPcs = 8;
    const shapes = generateSmartSiteFitShapes({
      bessCount: containersPerPcs,
      pcsCount: 1,
      containersPerPcs,
      strategy: "balanced",
    });
    const twoRow = shapes.find((s) => s.kind === "two_row_block")!;
    const items = buildShapeLayout(twoRow, 1, containersPerPcs, {
      bessToBess: 3.0,
      bessToPcs: 3.0,
      pcsToPcs: 3.0,
    });

    const bessY = [
      ...new Set(
        items
          .filter((i) => i.equipmentSpecId === SUNGROW_SHAPE_EQUIPMENT.bessSpecId)
          .map((i) => Math.round(i.y_m * 1000) / 1000)
      ),
    ].sort((a, b) => a - b);

    // Exactly two parallel rows.
    expect(bessY.length).toBe(2);

    // The edge-to-edge gap between the rows is the maintenance service corridor
    // (4 m), wider than the old bess-to-bess gap (3 m) it replaced.
    const centerToCenter = bessY[1] - bessY[0];
    const edgeGap = centerToCenter - BESS_WIDTH_M;
    expect(edgeGap).toBeCloseTo(SERVICE_CORRIDOR_M, 3);
    expect(edgeGap).toBeGreaterThan(3.0);
  });

  it("places spine_ribs with PCS on the centerline and ribs alternating sides", () => {
    const pcsCount = 4;
    const containersPerPcs = 8;
    const shapes = generateSmartSiteFitShapes({
      bessCount: pcsCount * containersPerPcs,
      pcsCount,
      containersPerPcs,
      strategy: "balanced",
    });
    const spine = shapes.find((s) => s.kind === "spine_ribs")!;
    expect(spine).toBeDefined();

    const items = buildShapeLayout(spine, pcsCount, containersPerPcs, {
      bessToBess: 3.0,
      bessToPcs: 3.0,
      pcsToPcs: 3.0,
    });

    // Capacity invariant: pcs PCS + pcs * containersPerPcs BESS.
    expect(items.length).toBe(pcsCount + pcsCount * containersPerPcs);

    const pcsItems = items.filter(
      (i) => i.equipmentSpecId === SUNGROW_SHAPE_EQUIPMENT.pcsSpecId
    );
    expect(pcsItems.length).toBe(pcsCount);

    // Every PCS sits on the central spine (y ≈ 0).
    for (const p of pcsItems) {
      expect(p.y_m).toBeCloseTo(0, 6);
    }

    // PCS are distributed along the spine, not stacked on a single x.
    const uniquePcsX = new Set(pcsItems.map((p) => Math.round(p.x_m)));
    expect(uniquePcsX.size).toBe(pcsCount);

    // Each rib stays entirely on one side of the road, alternating per block.
    for (let i = 0; i < pcsCount; i++) {
      const ribBess = items.filter(
        (it) =>
          it.equipmentSpecId === SUNGROW_SHAPE_EQUIPMENT.bessSpecId &&
          it.blockIndex === i
      );
      expect(ribBess.length).toBe(containersPerPcs);
      const expectedSign = i % 2 === 0 ? 1 : -1;
      for (const b of ribBess) {
        expect(Math.sign(b.y_m)).toBe(expectedSign);
      }
    }
  });

  it("arranges perimeter_ring on the boundary leaving an open central yard", () => {
    const pcsCount = 4;
    const containersPerPcs = 8;
    const shapes = generateSmartSiteFitShapes({
      bessCount: pcsCount * containersPerPcs,
      pcsCount,
      containersPerPcs,
      strategy: "balanced",
    });
    const ring = shapes.find((s) => s.kind === "perimeter_ring")!;
    expect(ring).toBeDefined();

    const items = buildShapeLayout(ring, pcsCount, containersPerPcs, {
      bessToBess: 3.0,
      bessToPcs: 3.0,
      pcsToPcs: 3.0,
    });

    // Capacity invariant preserved.
    expect(items.length).toBe(pcsCount + pcsCount * containersPerPcs);

    const pcsItems = items.filter(
      (i) => i.equipmentSpecId === SUNGROW_SHAPE_EQUIPMENT.pcsSpecId
    );
    expect(pcsItems.length).toBe(pcsCount);

    // PCS are distributed around the ring (not all on one coordinate).
    const uniquePcsX = new Set(pcsItems.map((p) => Math.round(p.x_m)));
    const uniquePcsY = new Set(pcsItems.map((p) => Math.round(p.y_m)));
    expect(uniquePcsX.size + uniquePcsY.size).toBeGreaterThan(2);

    // The central yard stays open: no equipment within the inner half of the
    // bounding box on both axes.
    const maxAbsX = Math.max(...items.map((i) => Math.abs(i.x_m)));
    const maxAbsY = Math.max(...items.map((i) => Math.abs(i.y_m)));
    const innerCount = items.filter(
      (i) => Math.abs(i.x_m) < 0.5 * maxAbsX && Math.abs(i.y_m) < 0.5 * maxAbsY
    ).length;
    expect(innerCount).toBe(0);
  });
});
