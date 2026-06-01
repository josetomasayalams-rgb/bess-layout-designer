import { describe, it, expect } from "vitest";
import { repairLayout, type LayoutRepairRules } from "./layoutRepair";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import { placedToRect } from "@/lib/layout/spacingRules";
import { distanceBetweenRectangles } from "@/lib/geometry/distance";
import {
  allCornersInsidePolygon,
  rectanglesIntersect,
} from "@/lib/geometry/collision";
import { toLngLat, toLocal } from "@/lib/geometry/projection";
import type { LngLat, ProjectAnchor } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";

const anchor: ProjectAnchor = { lng0: -70.6, lat0: -33.45 };

const batterySpec = equipmentCatalog.find(
  (spec) => spec.type === "battery_container"
);
if (!batterySpec) throw new Error("Test fixture: no battery_container in catalog");

const rules: LayoutRepairRules = {
  bessToBess_m: 3,
  bessToPropertyLine_m: 5,
  electricalFrontWorkingClearance_m: 4,
};

const pcsSpec = equipmentCatalog.find((spec) => spec.type === "pcs_mv_station");
if (!pcsSpec) throw new Error("Test fixture: no pcs_mv_station in catalog");

function battery(
  id: string,
  xM: number,
  yM: number,
  groupId?: string
): PlacedEquipment {
  return {
    id,
    equipmentSpecId: batterySpec!.id,
    anchor: toLngLat({ x_m: xM, y_m: yM }, anchor),
    rotation_deg: 0,
    sourceReliability: "preliminary_assumption",
    ...(groupId ? { groupId } : {}),
  };
}

function pcs(
  id: string,
  xM: number,
  yM: number,
  groupId?: string
): PlacedEquipment {
  return {
    id,
    equipmentSpecId: pcsSpec!.id,
    anchor: toLngLat({ x_m: xM, y_m: yM }, anchor),
    rotation_deg: 0,
    sourceReliability: "preliminary_assumption",
    ...(groupId ? { groupId } : {}),
  };
}

describe("repairLayout", () => {
  it("separates overlapping battery containers to satisfy spacing", () => {
    const placed = [battery("a", 0, 0), battery("b", 1, 0)];
    const result = repairLayout({ placed, anchor, polygon: [], rules });

    expect(result.status).toBe("success");
    expect(result.diagnostics.initialOverlaps).toBeGreaterThan(0);
    expect(result.diagnostics.remainingConflicts).toBe(0);

    const rectA = placedToRect(result.placed[0], anchor)!;
    const rectB = placedToRect(result.placed[1], anchor)!;
    expect(rectanglesIntersect(rectA, rectB)).toBe(false);
    expect(distanceBetweenRectangles(rectA, rectB)).toBeGreaterThanOrEqual(
      rules.bessToBess_m - 0.1
    );
  });

  it("leaves an already-valid layout untouched", () => {
    const placed = [battery("a", 0, 0), battery("b", 0, 30)];
    const result = repairLayout({ placed, anchor, polygon: [], rules });

    expect(result.status).toBe("success");
    expect(result.diagnostics.initialConflicts).toBe(0);
    expect(result.diagnostics.movedCount).toBe(0);
    expect(result.placed).toBe(placed);
  });

  it("returns an error when there is no equipment to repair", () => {
    const result = repairLayout({ placed: [], anchor, polygon: [], rules });
    expect(result.status).toBe("error");
  });

  it("repairs only equipment inside the selected zone, freezing the rest", () => {
    const placed = [battery("a", 0, 0), battery("b", 1, 0)];
    // Zone covers A's center (0,0) but not B's center (1,0).
    const repairZone: LngLat[] = [
      toLngLat({ x_m: -8, y_m: -8 }, anchor),
      toLngLat({ x_m: 0.5, y_m: -8 }, anchor),
      toLngLat({ x_m: 0.5, y_m: 8 }, anchor),
      toLngLat({ x_m: -8, y_m: 8 }, anchor),
    ];
    const result = repairLayout({
      placed,
      anchor,
      polygon: [],
      rules,
      repairZone,
    });

    expect(result.status).toBe("success");
    expect(result.diagnostics.zoneApplied).toBe(true);
    expect(result.diagnostics.movableCount).toBe(1);

    // B is outside the zone: frozen, untouched.
    expect(result.placed[1]).toBe(placed[1]);

    // A was reordered; the pair no longer overlaps.
    const rectA = placedToRect(result.placed[0], anchor)!;
    const rectB = placedToRect(result.placed[1], anchor)!;
    expect(rectanglesIntersect(rectA, rectB)).toBe(false);
    expect(distanceBetweenRectangles(rectA, rectB)).toBeGreaterThanOrEqual(
      rules.bessToBess_m - 0.1
    );
  });

  it("returns an error when the zone contains no equipment", () => {
    const placed = [battery("a", 0, 0), battery("b", 1, 0)];
    // Zone far away from both items.
    const repairZone: LngLat[] = [
      toLngLat({ x_m: 500, y_m: 500 }, anchor),
      toLngLat({ x_m: 540, y_m: 500 }, anchor),
      toLngLat({ x_m: 540, y_m: 540 }, anchor),
      toLngLat({ x_m: 500, y_m: 540 }, anchor),
    ];
    const result = repairLayout({
      placed,
      anchor,
      polygon: [],
      rules,
      repairZone,
    });
    expect(result.status).toBe("error");
    expect(result.diagnostics.movableCount).toBe(0);
  });

  it("pulls equipment back inside the site polygon", () => {
    const polygon: LngLat[] = [
      toLngLat({ x_m: 0, y_m: 0 }, anchor),
      toLngLat({ x_m: 120, y_m: 0 }, anchor),
      toLngLat({ x_m: 120, y_m: 120 }, anchor),
      toLngLat({ x_m: 0, y_m: 120 }, anchor),
    ];
    const placed = [battery("inside", 60, 60), battery("outside", 260, 60)];
    const result = repairLayout({ placed, anchor, polygon, rules });

    expect(result.status).toBe("success");
    expect(result.diagnostics.remainingConflicts).toBe(0);

    const localPolygon = polygon.map((vertex) => toLocal(vertex, anchor));
    for (const item of result.placed) {
      const rect = placedToRect(item, anchor)!;
      expect(allCornersInsidePolygon(rect, localPolygon)).toBe(true);
    }
  });

  it("does not move equipment listed in lockedIds", () => {
    const placed = [battery("a", 0, 0), battery("b", 1, 0)];
    const result = repairLayout({
      placed,
      anchor,
      polygon: [],
      rules,
      lockedIds: ["a"],
    });
    const aResult = result.placed.find((item) => item.id === "a")!;
    const aLocal = toLocal(aResult.anchor, anchor);
    expect(Math.hypot(aLocal.x_m, aLocal.y_m)).toBeLessThan(0.01);
  });

  it("compacts a spread layout into a smaller bounding area", () => {
    const placed = [
      battery("a", -30, 0),
      battery("b", 30, 0),
      battery("c", 0, 30),
      battery("d", 0, -30),
    ];
    const bboxAreaM2 = (items: PlacedEquipment[]) => {
      let minX = Infinity;
      let maxX = -Infinity;
      let minY = Infinity;
      let maxY = -Infinity;
      for (const item of items) {
        const local = toLocal(item.anchor, anchor);
        minX = Math.min(minX, local.x_m);
        maxX = Math.max(maxX, local.x_m);
        minY = Math.min(minY, local.y_m);
        maxY = Math.max(maxY, local.y_m);
      }
      return (maxX - minX) * (maxY - minY);
    };
    const before = bboxAreaM2(placed);
    const result = repairLayout({
      placed,
      anchor,
      polygon: [],
      rules,
      compaction: { strengthMPerIter: 0.4, iterations: 120 },
    });
    expect(result.status).not.toBe("error");
    const after = bboxAreaM2(result.placed);
    expect(after).toBeLessThan(before * 0.7);
  });
});

/** Distancia interna entre dos equipos colocados, en metros locales. */
function gapBetween(a: PlacedEquipment, b: PlacedEquipment): number {
  const pa = toLocal(a.anchor, anchor);
  const pb = toLocal(b.anchor, anchor);
  return Math.hypot(pa.x_m - pb.x_m, pa.y_m - pb.y_m);
}

describe("repairLayout — harmonic cluster behavior", () => {
  it("moves a grouped block rigidly, preserving internal spacing", () => {
    // Two blocks of two batteries each. The blocks overlap; the internal
    // spacing within each block (30 m apart) is already valid and must survive.
    const placed = [
      battery("a1", 0, 0, "block-1"),
      battery("a2", 0, 30, "block-1"),
      battery("b1", 4, 0, "block-2"),
      battery("b2", 4, 30, "block-2"),
    ];
    const internalBefore1 = gapBetween(placed[0], placed[1]);
    const internalBefore2 = gapBetween(placed[2], placed[3]);

    const result = repairLayout({ placed, anchor, polygon: [], rules });
    expect(result.status).toBe("success");
    expect(result.diagnostics.remainingConflicts).toBe(0);
    expect(result.diagnostics.clusterCount).toBe(2);
    expect(result.diagnostics.strategy).toBe("cluster-rigid");

    // Internal shape of each block is preserved (rigid move).
    const a1 = result.placed.find((p) => p.id === "a1")!;
    const a2 = result.placed.find((p) => p.id === "a2")!;
    const b1 = result.placed.find((p) => p.id === "b1")!;
    const b2 = result.placed.find((p) => p.id === "b2")!;
    expect(gapBetween(a1, a2)).toBeCloseTo(internalBefore1, 1);
    expect(gapBetween(b1, b2)).toBeCloseTo(internalBefore2, 1);

    // The two blocks no longer collide.
    const rectA1 = placedToRect(a1, anchor)!;
    const rectB1 = placedToRect(b1, anchor)!;
    expect(rectanglesIntersect(rectA1, rectB1)).toBe(false);
  });

  it("keeps each PCS/MV close to its associated BESS group", () => {
    // One unit cell: a PCS with two batteries, overlapping a second unit cell.
    const placed = [
      battery("u1-b1", 0, 0, "unit-1"),
      battery("u1-b2", 0, 12, "unit-1"),
      pcs("u1-pcs", 0, 6, "unit-1"),
      battery("u2-b1", 5, 0, "unit-2"),
      battery("u2-b2", 5, 12, "unit-2"),
      pcs("u2-pcs", 5, 6, "unit-2"),
    ];
    const result = repairLayout({ placed, anchor, polygon: [], rules });
    expect(result.status).not.toBe("error");

    // Each PCS stays nearest to a battery of its own unit.
    for (const [unit, pcsId] of [
      ["unit-1", "u1-pcs"],
      ["unit-2", "u2-pcs"],
    ] as const) {
      const pcsItem = result.placed.find((p) => p.id === pcsId)!;
      const ownBatteries = result.placed.filter(
        (p) => p.groupId === unit && p.id !== pcsItem.id
      );
      const nearestOwn = Math.min(
        ...ownBatteries.map((b) => gapBetween(pcsItem, b))
      );
      // The PCS should remain within a reasonable distance of its own group
      // (rigid move keeps the unit-cell intact).
      expect(nearestOwn).toBeLessThan(20);
    }
  });

  it("does not disperse an already-valid grouped layout", () => {
    const placed = [
      battery("a1", 0, 0, "block-1"),
      battery("a2", 0, 30, "block-1"),
      battery("b1", 60, 0, "block-2"),
      battery("b2", 60, 30, "block-2"),
    ];
    const result = repairLayout({ placed, anchor, polygon: [], rules });
    expect(result.status).toBe("success");
    expect(result.diagnostics.movedCount).toBe(0);
    expect(result.placed).toBe(placed);
  });

  it("prefers the candidate that pulls a block fully inside the polygon", () => {
    const polygon: LngLat[] = [
      toLngLat({ x_m: 0, y_m: 0 }, anchor),
      toLngLat({ x_m: 200, y_m: 0 }, anchor),
      toLngLat({ x_m: 200, y_m: 200 }, anchor),
      toLngLat({ x_m: 0, y_m: 200 }, anchor),
    ];
    // A grouped block straddling the right edge of the site.
    const placed = [
      battery("a1", 190, 100, "block-1"),
      battery("a2", 205, 100, "block-1"),
    ];
    const result = repairLayout({ placed, anchor, polygon, rules });
    expect(result.status).toBe("success");
    expect(result.diagnostics.remainingConflicts).toBe(0);

    const localPolygon = polygon.map((vertex) => toLocal(vertex, anchor));
    for (const item of result.placed) {
      const rect = placedToRect(item, anchor)!;
      expect(allCornersInsidePolygon(rect, localPolygon)).toBe(true);
    }
    // A scoring result was attached to the chosen candidate.
    expect(result.diagnostics.score).not.toBeNull();
    expect(result.diagnostics.score!.outsideCount).toBe(0);
  });
});
