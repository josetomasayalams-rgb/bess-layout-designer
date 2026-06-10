import { describe, it, expect } from "vitest";
import { equipmentCatalog } from "@/data/equipmentCatalog";
import { toLngLat, toLocal } from "@/lib/geometry/projection";
import type { LngLat, ProjectAnchor } from "@/types/geometry";
import type { PlacedEquipment } from "@/types/equipment";
import {
  measureInterferences,
  planSmartLayoutRepair,
} from "./smartRepairLayout";

const anchor: ProjectAnchor = { lng0: -70.6, lat0: -33.45 };

const batterySpec = equipmentCatalog.find((spec) => spec.type === "battery_container");
if (!batterySpec) throw new Error("Test setup error: no battery_container in catalog");

const pcsSpec = equipmentCatalog.find((spec) => spec.type === "pcs_mv_station");
if (!pcsSpec) throw new Error("Test setup error: no pcs_mv_station in catalog");

function battery(
  id: string,
  xM: number,
  yM: number,
  blockId?: string
): PlacedEquipment {
  return {
    id,
    equipmentSpecId: batterySpec!.id,
    anchor: toLngLat({ x_m: xM, y_m: yM }, anchor),
    rotation_deg: 0,
    sourceReliability: "preliminary_assumption",
    blockId,
  };
}

function pcs(
  id: string,
  xM: number,
  yM: number,
  blockId?: string
): PlacedEquipment {
  return {
    id,
    equipmentSpecId: pcsSpec!.id,
    anchor: toLngLat({ x_m: xM, y_m: yM }, anchor),
    rotation_deg: 0,
    sourceReliability: "preliminary_assumption",
    blockId,
  };
}

describe("Reparacion Inteligente Layout - Phase F0: measureInterferences", () => {
  it("returns zero interferences for empty layout or missing anchor", () => {
    const metricsNullAnchor = measureInterferences([], null, []);
    expect(metricsNullAnchor.totalInterferences).toBe(0);

    const metricsEmptyPlaced = measureInterferences([], anchor, []);
    expect(metricsEmptyPlaced.totalInterferences).toBe(0);
  });

  it("detects cable-equipment interference when a cable passes close to another block's equipment", () => {
    // Block 1: PCS at (10, 10). Cable runs along Y = 10.
    const b1_pcs = pcs("b1-pcs", 10, 10, "block-1");
    
    // Block 2: PCS at (40, 30), BESS at (40, 10).
    // The BESS at (40, 10) lies directly on Block 1's cable corridor (Y = 10).
    const b2_pcs = pcs("b2-pcs", 40, 30, "block-2");
    const b2_bess = battery("b2-bess", 40, 10, "block-2");

    const placed = [b1_pcs, b2_pcs, b2_bess];
    const metrics = measureInterferences(placed, anchor, []);

    // Block 1's cable corridor goes horizontally from (10, 10) to MV Yard center (along Y = 10).
    // Block 2's BESS is at (40, 10), which is exactly on this path (distance is 0).
    // Clearance < 1.0 m, so it must count as an interference.
    expect(metrics.cableEquipmentCount).toBe(1);
    expect(metrics.totalInterferences).toBe(1);
    expect(metrics.details.cableEquipment[0].equipmentId).toBe("b2-bess");
  });

  it("reports cable-equipment interference for same-block equipment if it overlaps the horizontal cable path", () => {
    // All equipment belongs to block-1. BESS is directly in the horizontal line of PCS.
    const b1_pcs = pcs("b1-pcs", 10, 10, "block-1");
    const b1_bess = battery("b1-bess", 40, 10, "block-1");

    const placed = [b1_pcs, b1_bess];
    const metrics = measureInterferences(placed, anchor, []);

    // Since object.id !== route.fromEntityId, same-block equipment is evaluated and reports interference
    // if placed directly on the cable path.
    expect(metrics.cableEquipmentCount).toBe(1);
  });

  it("keeps exact counts while capping stored interference details", () => {
    const placed: PlacedEquipment[] = [pcs("b1-pcs", 10, 10, "block-1")];
    for (let i = 0; i < 6; i++) {
      placed.push(battery(`b${i}-bess`, 25 + i * 10, 10, `block-${i + 2}`));
    }

    const metrics = measureInterferences(placed, anchor, [], { detailLimit: 2 });

    expect(metrics.cableEquipmentCount).toBeGreaterThan(2);
    expect(metrics.details.cableEquipment).toHaveLength(2);
    expect(metrics.totalInterferences).toBe(
      metrics.cableEquipmentCount + metrics.cableRoadCount
    );
  });
});

describe("Reparacion Inteligente Layout - Phase F1: planSmartLayoutRepair", () => {
  it("nudges a block vertically to resolve a cable-equipment interference", () => {
    // Setup interference case with PCS in Block 2. We lock Block 1 to force Block 2 to move.
    const b1_pcs = { ...pcs("b1-pcs", 10, 10, "block-1"), locked: true };
    const b2_pcs = pcs("b2-pcs", 40, 30, "block-2");
    const b2_bess = battery("b2-bess", 40, 10, "block-2");

    const placed = [b1_pcs, b2_pcs, b2_bess];
    const request = {
      placed,
      anchor,
      polygon: [], // no site boundary
      rules: {
        bessToBess_m: 3,
        bessToPropertyLine_m: 3,
        electricalFrontWorkingClearance_m: 0.9,
      },
    };

    const plan = planSmartLayoutRepair(request);

    expect(plan.improved).toBe(true);
    expect(plan.proposed.totalInterferences).toBe(0);
    expect(plan.movedEquipmentIds).toContain("b2-bess");

    // The BESS at block-2 should have been shifted vertically (Y coordinate is no longer 10)
    const resultBess = plan.placed.find((item) => item.id === "b2-bess")!;
    const bessLocal = toLocal(resultBess.anchor, anchor);
    expect(Math.abs(bessLocal.y_m - 10)).toBeGreaterThanOrEqual(1.0);
  });

  it("returns improved = false and unchanged layout when already clean", () => {
    // Block 1 at (10, 10), Block 2 at (40, 30) - well separated, no Y overlap
    const b1_pcs = pcs("b1-pcs", 10, 10, "block-1");
    const b2_bess = battery("b2-bess", 40, 30, "block-2");

    const placed = [b1_pcs, b2_bess];
    const request = {
      placed,
      anchor,
      polygon: [],
    };

    const plan = planSmartLayoutRepair(request);

    expect(plan.improved).toBe(false);
    expect(plan.movedEquipmentIds.length).toBe(0);
    expect(plan.placed).toStrictEqual(placed);
  });

  it("respects site boundary: does not shift a block if it would move outside the polygon", () => {
    // Setup site polygon: a narrow horizontal band from Y = 4 to Y = 16
    // At Y = 10, BESS has 0 boundary conflicts with 5m setback. Any shift will violate it.
    const sitePolygon: LngLat[] = [
      toLngLat({ x_m: 0, y_m: 4 }, anchor),
      toLngLat({ x_m: 150, y_m: 4 }, anchor),
      toLngLat({ x_m: 150, y_m: 16 }, anchor),
      toLngLat({ x_m: 0, y_m: 16 }, anchor),
    ];

    // Block 1 (Locked): PCS at (10, 10). Cable runs horizontally along Y = 10.
    const b1_pcs = { ...pcs("b1-pcs", 10, 10, "block-1"), locked: true };
    // Block 2 (Movable): BESS at (40, 10) is overlapping Block 1's cable corridor.
    const b2_bess = battery("b2-bess", 40, 10, "block-2");

    const placed = [b1_pcs, b2_bess];
    const request = {
      placed,
      anchor,
      polygon: sitePolygon,
      rules: {
        bessToBess_m: 3,
        bessToPropertyLine_m: 5, // Strict setback!
        electricalFrontWorkingClearance_m: 0.9,
      },
    };

    const plan = planSmartLayoutRepair(request);

    // Should not shift block-2 because doing so would trigger boundary conflicts, and block-1 is locked
    expect(plan.improved).toBe(false);
    expect(plan.placed).toStrictEqual(placed);
  });

  it("respects locked equipment: does not shift locked blocks", () => {
    // Lock both blocks to prevent either from moving
    const b1_pcs = { ...pcs("b1-pcs", 10, 10, "block-1"), locked: true };
    const b2_bess = { ...battery("b2-bess", 40, 10, "block-2"), locked: true };

    const placed = [b1_pcs, b2_bess];
    const request = {
      placed,
      anchor,
      polygon: [],
    };

    const plan = planSmartLayoutRepair(request);

    expect(plan.improved).toBe(false);
    expect(plan.placed).toStrictEqual(placed);
  });

  it("respects lockedIds list: does not shift blocks with IDs in lockedIds", () => {
    // Lock both blocks: block-1 through locked property, block-2 through lockedIds list
    const b1_pcs = { ...pcs("b1-pcs", 10, 10, "block-1"), locked: true };
    const b2_bess = battery("b2-bess", 40, 10, "block-2");

    const placed = [b1_pcs, b2_bess];
    const request = {
      placed,
      anchor,
      polygon: [],
      lockedIds: ["b2-bess"],
    };

    const plan = planSmartLayoutRepair(request);

    expect(plan.improved).toBe(false);
    expect(plan.placed).toStrictEqual(placed);
  });
});
