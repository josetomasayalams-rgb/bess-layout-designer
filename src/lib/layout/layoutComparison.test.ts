import { describe, expect, it } from "vitest";
import {
  computeAlternativeMetrics,
  recommendAlternative,
} from "@/lib/layout/layoutComparison";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import { toLngLat } from "@/lib/geometry/projection";
import type { LngLat, ProjectAnchor } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";

const anchor: ProjectAnchor = { lng0: -70.6, lat0: -33.45 };

const batterySpec = equipmentCatalog.find(
  (s) => s.type === "battery_container"
);
if (!batterySpec) throw new Error("Test fixture: no battery_container");

function battery(id: string, xM: number, yM: number): PlacedEquipment {
  return {
    id,
    equipmentSpecId: batterySpec!.id,
    anchor: toLngLat({ x_m: xM, y_m: yM }, anchor),
    rotation_deg: 0,
    sourceReliability: "preliminary_assumption",
  };
}

const polygon: LngLat[] = [
  toLngLat({ x_m: -50, y_m: -50 }, anchor),
  toLngLat({ x_m: 100, y_m: -50 }, anchor),
  toLngLat({ x_m: 100, y_m: 100 }, anchor),
  toLngLat({ x_m: -50, y_m: 100 }, anchor),
];

describe("computeAlternativeMetrics", () => {
  it("counts equipment and reports a clean layout as compliant", () => {
    const placed = [battery("a", 0, 0), battery("b", 0, 40)];
    const metrics = computeAlternativeMetrics(placed, polygon, anchor);

    expect(metrics.equipmentCount).toBe(2);
    expect(metrics.batteryCount).toBe(2);
    expect(metrics.collisionCount).toBe(0);
    expect(metrics.outOfBoundsCount).toBe(0);
    expect(metrics.compliant).toBe(true);
    expect(metrics.boundingAreaM2).toBeGreaterThan(0);
  });

  it("detects collisions and equipment outside the polygon", () => {
    const placed = [
      battery("a", 0, 0),
      battery("b", 1, 0), // overlaps a
      battery("c", 400, 0), // far outside the polygon
    ];
    const metrics = computeAlternativeMetrics(placed, polygon, anchor);

    expect(metrics.collisionCount).toBe(1);
    expect(metrics.outOfBoundsCount).toBe(1);
    expect(metrics.compliant).toBe(false);
  });
});

describe("recommendAlternative", () => {
  it("prefers the compliant alternative", () => {
    const clean = computeAlternativeMetrics(
      [battery("a", 0, 0), battery("b", 0, 40)],
      polygon,
      anchor
    );
    const dirty = computeAlternativeMetrics(
      [battery("a", 0, 0), battery("b", 1, 0)],
      polygon,
      anchor
    );
    expect(recommendAlternative(clean, dirty)).toEqual({
      slot: "A",
      reason: "compliant",
    });
    expect(recommendAlternative(dirty, clean).slot).toBe("B");
  });

  it("prefers the more compact layout when both are compliant", () => {
    const compact = computeAlternativeMetrics(
      [battery("a", 0, 0), battery("b", 0, 20)],
      polygon,
      anchor
    );
    const spread = computeAlternativeMetrics(
      [battery("a", 0, 0), battery("b", 0, 80)],
      polygon,
      anchor
    );
    const result = recommendAlternative(compact, spread);
    expect(result.slot).toBe("A");
    expect(result.reason).toBe("more-compact");
  });
});
