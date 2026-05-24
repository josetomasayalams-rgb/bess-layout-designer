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

function battery(id: string, xM: number, yM: number): PlacedEquipment {
  return {
    id,
    equipmentSpecId: batterySpec!.id,
    anchor: toLngLat({ x_m: xM, y_m: yM }, anchor),
    rotation_deg: 0,
    sourceReliability: "preliminary_assumption",
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
